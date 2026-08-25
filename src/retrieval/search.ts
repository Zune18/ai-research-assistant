import { embedText } from "../embeddings/embed";
import { getIndex } from "../db/pinecone/client";
import { createLogger } from "../utils/logger";

const log = createLogger({ agent: "RetrievalAgent" });

export interface RetrievedChunk {
  id: string;
  score: number;
  text: string;
  url: string;
  title: string;
  chunkIndex: number;
}

export interface SearchFilters {
  url?: string;
  chunkIndexGte?: number; // e.g. only chunks from later in a document
}

function buildPineconeFilter(filters?: SearchFilters): Record<string, unknown> | undefined {
  if (!filters) return undefined;

  const conditions: Record<string, unknown>[] = [];

  if (filters.url) {
    conditions.push({ url: { $eq: filters.url } });
  }
  if (filters.chunkIndexGte !== undefined) {
    conditions.push({ chunkIndex: { $gte: filters.chunkIndexGte } });
  }

  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : { $and: conditions };
}

// Embeds a query and retrieves the topK most semantically similar chunks from Pinecone. 
export async function semanticSearch(
  query: string,
  runId: string,
  topK = 10,
  filters?: SearchFilters
): Promise<RetrievedChunk[]> {
  log.info({ query, runId, topK, filters }, "Running semantic search");

  const queryVector = await embedText(query);
  const index = getIndex().namespace(runId);

  const pineconeFilter = buildPineconeFilter(filters);

  const results = await index.query({
    vector: queryVector,
    topK,
    includeMetadata: true,
    ...(pineconeFilter ? { filter: pineconeFilter } : {}),
  });

  const chunks: RetrievedChunk[] = results.matches.map((match) => ({
    id: match.id,
    score: match.score ?? 0,
    text: (match.metadata?.text as string) ?? "",
    url: (match.metadata?.url as string) ?? "",
    title: (match.metadata?.title as string) ?? "",
    chunkIndex: (match.metadata?.chunkIndex as number) ?? 0,
  }));

  log.info({ query, runId, resultCount: chunks.length }, "Semantic search complete");

  return chunks;
}