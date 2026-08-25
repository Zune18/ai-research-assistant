import { createHash } from "node:crypto";
import { getIndex } from "../db/pinecone/client";
import type { EmbeddedChunk } from "./embed-chunks";
import { createLogger } from "../utils/logger";

const log = createLogger({ agent: "EmbeddingAgent" });

export interface ChunkMetadata {
  url: string;
  runId: string;
  chunkIndex: number;
  text: string;
  title?: string;
}

/**
 * Deterministic chunk ID: same url + chunkIndex always produces the same ID,
 * so re-scraping/re-embedding the same source overwrites existing vectors
 * instead of creating duplicates.
 */
function makeChunkId(url: string, chunkIndex: number): string {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 16);
  return `${hash}-chunk-${chunkIndex}`;
}


// Upserts a batch of embedded chunks into Pinecone
export async function upsertChunks(
  embeddedChunks: EmbeddedChunk[],
  context: { url: string; runId: string; title?: string }
): Promise<number> {
  if (embeddedChunks.length === 0) {
    log.warn({ url: context.url }, "No chunks to upsert");
    return 0;
  }

  const index = getIndex().namespace(context.runId); // scope to this run's namespace

  const records = embeddedChunks.map((chunk) => ({
    id: makeChunkId(context.url, chunk.index),
    values: chunk.embedding,
    metadata: {
      url: context.url,
      runId: context.runId,
      chunkIndex: chunk.index,
      text: chunk.text,
      title: context.title ?? "",
    } satisfies ChunkMetadata,
  }));

  await index.upsert({ records });

  log.info({ url: context.url, runId: context.runId, count: records.length }, "Upserted chunks to Pinecone");

  return records.length;
}