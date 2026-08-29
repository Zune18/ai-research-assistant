import axios from "axios";
import { env } from "../config/env";
import { createLogger } from "../utils/logger";

const log = createLogger({ agent: "RerankerAgent" });

const RERANK_MODEL = "nvidia/llama-nemotron-rerank-vl-1b-v2:free";

export interface RerankResult {
  index: number; // original index in the input documents array
  relevanceScore: number;
}

/**
 * Reranks a list of candidate documents against a query using a cross-encoder
 * model — more accurate than embedding similarity alone, query and
 * document are evaluated together rather than as independently-computed vectors.
 */
export async function rerank(
  query: string,
  documents: string[]
): Promise<RerankResult[]> {
  if (documents.length === 0) {
    return [];
  }

  // const response = await axios.post(
  //   "https://openrouter.ai/api/v1/rerank",
  //   {
  //     model: RERANK_MODEL,
  //     query,
  //     documents,
  //   },
  //   {
  //     headers: {
  //       Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
  //       "Content-Type": "application/json",
  //     },
  //   }
  // );

  // Using local rerank service
  const response = await axios.post(
    "http://127.0.0.1:8080/v1/rerank",
    {
      model: "Qwen3-reranker-0.6B",
      query,
      documents,
      top_n: documents.length,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const results = response.data.results;

  if (!Array.isArray(results)) {
    log.error({ response: response.data }, "Unexpected rerank response shape");
    throw new Error("Rerank request returned an unexpected response shape");
  }

    const rerankResults: RerankResult[] = results.map((r: any) => ({
        index: r.index,
        relevanceScore: r.relevance_score ?? 0,
    }));

  log.info({ query, documentCount: documents.length }, "Reranking complete");

  return rerankResults;
}