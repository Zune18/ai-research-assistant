import axios from "axios";
import { env } from "../config/env";
import { createLogger } from "../utils/logger";

const log = createLogger({ component: "StreamChat" });

/**
 * Streams a chat completion from OpenRouter token-by-token, calling
 * onToken for each piece of text as it arrives over the HTTP connection.
 * Returns the full assembled text once the stream ends.
 */
export async function streamChatText(
  prompt: string,
  onToken: (token: string) => void
): Promise<string> {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "openrouter/auto-beta",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    },
    {
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      responseType: "stream",
    }
  );

  let fullText = "";

  return new Promise((resolve, reject) => {
    response.data.on("data", (chunk: Buffer) => {
      // OpenRouter streams Server-Sent Events: lines prefixed with "data: ",
      // each containing a JSON payload, terminated by "data: [DONE]".
      const lines = chunk
        .toString()
        .split("\n")
        .filter((line) => line.trim().startsWith("data: "));

      for (const line of lines) {
        const payload = line.replace(/^data: /, "").trim();

        if (payload === "[DONE]") {
          continue;
        }

        try {
          const parsed = JSON.parse(payload);
          const token = parsed.choices?.[0]?.delta?.content;

          if (token) {
            fullText += token;
            onToken(token);
          }
        } catch (err) {
          log.error({ err, payload }, "Failed to parse stream chunk");
        }
      }
    });

    response.data.on("end", () => {
      log.info({ length: fullText.length }, "Stream completed");
      resolve(fullText);
    });

    response.data.on("error", (err: Error) => {
      log.error({ err }, "Stream error");
      reject(err);
    });
  });
}