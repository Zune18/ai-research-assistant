// import axios from "axios";
// import { env } from "../config/env";
// import { createLogger } from "../utils/logger";

// const log = createLogger({ component: "StreamChat" });

// /**
//  * Streams a chat completion from OpenRouter token-by-token, calling
//  * onToken for each piece of text as it arrives over the HTTP connection.
//  * Returns the full assembled text once the stream ends.
//  */
// export async function streamChatText(
//   prompt: string,
//   onToken: (token: string) => void
// ): Promise<string> {
//   const response = await axios.post(
//     "https://openrouter.ai/api/v1/chat/completions",
//     {
//       model: "openrouter/auto-beta",
//       messages: [{ role: "user", content: prompt }],
//       stream: true,
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
//         "Content-Type": "application/json",
//       },
//       responseType: "stream",
//     }
//   );

//   let fullText = "";

//   return new Promise((resolve, reject) => {
//     response.data.on("data", (chunk: Buffer) => {
//       // OpenRouter streams Server-Sent Events: lines prefixed with "data: ",
//       // each containing a JSON payload, terminated by "data: [DONE]".
//       const lines = chunk
//         .toString()
//         .split("\n")
//         .filter((line) => line.trim().startsWith("data: "));

//       for (const line of lines) {
//         const payload = line.replace(/^data: /, "").trim();

//         if (payload === "[DONE]") {
//           continue;
//         }

//         try {
//           const parsed = JSON.parse(payload);
//           const token = parsed.choices?.[0]?.delta?.content;

//           if (token) {
//             fullText += token;
//             onToken(token);
//           }
//         } catch (err) {
//           log.error({ err, payload }, "Failed to parse stream chunk");
//         }
//       }
//     });

//     response.data.on("end", () => {
//       log.info({ length: fullText.length }, "Stream completed");
//       resolve(fullText);
//     });

//     response.data.on("error", (err: Error) => {
//       log.error({ err }, "Stream error");
//       reject(err);
//     });
//   });
// }


import axios from "axios";
import { createLogger } from "../utils/logger";

const log = createLogger({ component: "StreamChat" });

const LOCAL_LLM_URL = "http://127.0.0.1:8082/v1/chat/completions";
const LOCAL_LLM_MODEL = "qwen3";

/**
 * Streams a chat completion from the local llama.cpp server.
 * Calls onToken for each piece of generated text.
 * Returns the complete assembled response.
 */
export async function streamChatText(
  prompt: string,
  onToken: (token: string) => void
): Promise<string> {
  const response = await axios.post(
    LOCAL_LLM_URL,
    {
      model: LOCAL_LLM_MODEL,
      messages: [
        {
          role: "user",
          content: `/no_think\n${prompt}`,
        },
      ],
      temperature: 0.2,
      stream: true,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      responseType: "stream",
      timeout: 120_000,
    }
  );

  return new Promise((resolve, reject) => {
    let fullText = "";
    let buffer = "";
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;

      log.info(
        { length: fullText.length },
        "Local LLM stream completed"
      );

      resolve(fullText);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;

      log.error({ err }, "Local LLM stream failed");
      reject(err);
    };

    const processLine = (line: string) => {
      const trimmedLine = line.trim();

      if (!trimmedLine.startsWith("data:")) return;

      const payload = trimmedLine.slice(5).trim();

      if (!payload || payload === "[DONE]") return;

      try {
        const parsed = JSON.parse(payload);
        const token = parsed.choices?.[0]?.delta?.content;

        if (typeof token === "string" && token.length > 0) {
          fullText += token;
          onToken(token);
        }
      } catch (err) {
        log.error(
          { err, payload },
          "Failed to parse local LLM stream chunk"
        );
      }
    };

    response.data.on("data", (chunk: Buffer | string) => {
      if (settled) return;

      try {
        buffer += chunk.toString();

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          processLine(line);
        }
      } catch (err) {
        fail(err instanceof Error ? err : new Error(String(err)));
      }
    });

    response.data.on("end", () => {
      if (buffer.trim()) {
        processLine(buffer);
      }

      finish();
    });

    response.data.on("error", (err: Error) => {
      fail(err);
    });

    response.data.on("aborted", () => {
      fail(new Error("Local LLM stream was aborted"));
    });
  });
}
