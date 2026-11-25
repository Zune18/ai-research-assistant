// import axios from "axios";
// import { env } from "../config/env";
// import { createLogger } from "../utils/logger";

// const log = createLogger({ component: "OpenRouter" });

// const CHAT_MODEL = "openrouter/auto-beta";

// const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// function headers() {
//   return {
//     Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
//     "Content-Type": "application/json",
//   };
// }

// export async function chatText(prompt: string): Promise<string> {
//   const response = await axios.post(
//     OPENROUTER_URL,
//     {
//       model: CHAT_MODEL,
//       messages: [{ role: "user", content: prompt }],
//     },
//     { headers: headers() }
//   );

//   const content = response.data.choices?.[0]?.message?.content;

//   if (typeof content !== "string") {
//     log.error({ response: response.data }, "Unexpected chat response shape");
//     throw new Error("Chat request returned no text content");
//   }

//   return content;
// }

// export async function chatJSON<T>(
//   prompt: string,
//   schema: Record<string, unknown>,
//   schemaName = "response"
// ): Promise<T> {
//   const response = await axios.post(
//     OPENROUTER_URL,
//     {
//       model: CHAT_MODEL,
//       messages: [{ role: "user", content: prompt }],
//       response_format: {
//         type: "json_schema",
//         json_schema: {
//           name: schemaName,
//           strict: true,
//           schema: {
//             ...schema,
//             additionalProperties: false, // required when strict: true
//           },
//         },
//       },
//     },
//     { headers: headers() }
//   );

//   const content = response.data.choices?.[0]?.message?.content;

//   if (typeof content !== "string") {
//     log.error({ response: response.data }, "Unexpected chatJSON response shape");
//     throw new Error("chatJSON request returned no content");
//   }

//   try {
//     return JSON.parse(content) as T;
//   } catch (err) {
//     log.error({ content, err }, "Failed to parse JSON from model response");
//     throw new Error("Model did not return valid JSON");
//   }
// }


import axios from "axios";
import { createLogger } from "../utils/logger";

const log = createLogger({ component: "LocalLLM" });

const LOCAL_LLM_URL = "http://127.0.0.1:8082/v1/chat/completions";
const LOCAL_LLM_MODEL = "qwen3";

function preparePrompt(prompt: string): string {
  return `/no_think\n${prompt}`;
}

async function chat(prompt: string, responseFormat?: Record<string, unknown>): Promise<string> {
  try {
    const response = await axios.post(
      LOCAL_LLM_URL,
      {
        model: LOCAL_LLM_MODEL,
        messages: [
          {
            role: "user",
            content: preparePrompt(prompt),
          },
        ],
        ...(responseFormat ? { response_format: responseFormat } : {}),
        temperature: 0.2,
        stream: false,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 120_000,
      }
    );

    const content = response.data.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      log.error(
        { response: response.data },
        "Local LLM returned no text content"
      );
      throw new Error("Local LLM returned no text content");
    }

    return content.trim();
  } catch (err) {
    log.error({ err }, "Local LLM request failed");
    throw err;
  }
}

export async function chatText(prompt: string): Promise<string> {
  return chat(prompt);
}

export async function chatJSON<T>(
  prompt: string,
  schema: Record<string, unknown>,
  schemaName = "response"
): Promise<T> {
  const content = await chat(prompt, {
    type: "json_schema",
    json_schema: {
      name: schemaName,
      strict: true,
      schema: {
        ...schema,
        additionalProperties: false,
      },
    },
  });

  try {
    return JSON.parse(content) as T;
  } catch (err) {
    log.error({ content, err }, "Failed to parse JSON from local LLM");
    throw new Error("Local LLM did not return valid JSON");
  }
}
