import { embedText } from "./embed";
import type { Chunk } from "./chunk";
import { createLogger } from "../utils/logger";

const log = createLogger({ agent: "EmbeddingAgent" });

export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

/**
 * Embeds a batch of chunks with limited concurrency, so we dont fire 50+
 * simultaneous requests at a free-tier model.
 * Failures for individual chunks are logged and skipped, not bad to the
 * whole batch — one bad chunk shouldnt lose all the other work.
 */
export async function embedChunks(
  chunks: Chunk[],
  concurrency = 3
): Promise<EmbeddedChunk[]> {
  const results: EmbeddedChunk[] = [];
  const queue = [...chunks];

  async function worker() {
    while (queue.length > 0) {
      const chunk = queue.shift();
      if (!chunk) continue;

      try {
        const embedding = await embedText(chunk.text);
        results.push({ ...chunk, embedding });
      } catch (err) {
        log.error({ chunkIndex: chunk.index, err }, "Failed to embed chunk, skipping");
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  // Restore original order — concurrent workers complete out of order
  results.sort((a, b) => a.index - b.index);

  log.info({ requested: chunks.length, succeeded: results.length }, "Batch embedding complete");

  return results;
}