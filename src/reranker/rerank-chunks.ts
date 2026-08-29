import { rerank } from "./rerank";
import type { RetrievedChunk } from "../retrieval/search";
import { createLogger } from "../utils/logger";

const log = createLogger({ agent: "RerankerAgent" });

export interface RerankedChunk extends RetrievedChunk {
  relevanceScore: number;
}

/**
 * Reranks a set of retrieved chunks against the original query, keeping
 * only the true top `keepTopN` by cross-encoder relevance score — discarding
 * chunks that scored well on embedding similarity but are determined
 * to be less relevant by the more accurate reranker.
 */
export async function rerankChunks(
  query: string,
  chunks: RetrievedChunk[],
  keepTopN = 5
): Promise<RerankedChunk[]> {
  if (chunks.length === 0) {
    return [];
  }

  const documents = chunks.map((c) => c.text);
  const rerankResults = await rerank(query, documents);

  const rerankedChunks: RerankedChunk[] = rerankResults.map((r) => ({
    ...chunks[r.index],
    relevanceScore: r.relevanceScore,
  }));

  // Sort descending
  rerankedChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const kept = rerankedChunks.slice(0, keepTopN);

  log.info(
    { query, retrievedCount: chunks.length, keptCount: kept.length },
    "Reranked and truncated chunks"
  );

  return kept;
}