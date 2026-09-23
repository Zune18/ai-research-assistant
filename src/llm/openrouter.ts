import axios from "axios";
import { env } from "../config/env";
import { createLogger } from "../utils/logger";

const log = createLogger({ component: "OpenRouter" });

const CHAT_MODEL = "openrouter/auto-beta";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function headers() {
  return {
    Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function chatText(prompt: string): Promise<string> {
  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: CHAT_MODEL,
      messages: [{ role: "user", content: prompt }],
    },
    { headers: headers() }
  );

  const content = response.data.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    log.error({ response: response.data }, "Unexpected chat response shape");
    throw new Error("Chat request returned no text content");
  }

  return content;
}

export async function chatJSON<T>(
  prompt: string,
  schema: Record<string, unknown>,
  schemaName = "response"
): Promise<T> {
  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: CHAT_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema: {
            ...schema,
            additionalProperties: false, // required when strict: true
          },
        },
      },
    },
    { headers: headers() }
  );

  const content = response.data.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    log.error({ response: response.data }, "Unexpected chatJSON response shape");
    throw new Error("chatJSON request returned no content");
  }

  try {
    return JSON.parse(content) as T;
  } catch (err) {
    log.error({ content, err }, "Failed to parse JSON from model response");
    throw new Error("Model did not return valid JSON");
  }
}