import { buildDemoGraph } from "./demo-graph";
import { createLogger } from "../utils/logger";

const log = createLogger({ component: "StreamingDemo" });

/**
 * Runs the demo graph via stream() instead of invoke(), logging each
 * node's output as it completes rather than waiting for the final result.
 */
export async function runWithUpdates(threadId: string) {
  const graph = buildDemoGraph();
  const config = { configurable: { thread_id: threadId } };

  const chunks: Array<Record<string, unknown>> = [];

  for await (const chunk of await graph.stream({}, { ...config, streamMode: "updates" })) {
    log.info({ chunk }, "Received stream chunk");
    chunks.push(chunk);
  }

  return chunks;
}