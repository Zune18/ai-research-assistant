import axios from "axios";
import { env } from "../config/env";
import { createLogger } from "../utils/logger";

const log = createLogger({ agent: "EmbeddingAgent" });

const EMBEDDING_MODEL = "liquid/lfm-2.5-embedding-350m:free";
export const EMBEDDING_DIMENSION = env.EMBEDDING_DIMENSION;

export async function embedText(text: string): Promise<number[]> {
  // const response = await axios.post(
  //   "https://openrouter.ai/api/v1/embeddings",
  //   { model: EMBEDDING_MODEL, input: text },
  //   {
  //     headers: {
  //       Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
  //       "Content-Type": "application/json",
  //     },
  //   }
  // );

  // Using local embedding service
  const response = await axios.post(
    "http://127.0.0.1:8081/v1/embeddings",
    {
      model: "Qwen3-Embedding-0.6B",
      input: text,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const embedding = response.data.data?.[0]?.embedding;

  if (!embedding || embedding.length !== EMBEDDING_DIMENSION) {
    log.error({ received: embedding?.length }, "Unexpected embedding dimension");
    throw new Error(
      `Expected ${EMBEDDING_DIMENSION}-dim embedding, got ${embedding?.length ?? "none"}`
    );
  }

  return embedding;
}