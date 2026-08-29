import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildResearchPipelineGraph } from "./research-pipeline";

describe("Research pipeline: full chain through reranking", () => {
  it("retrieves, reranks, and builds final context with relevance scores", async () => {
    const graph = buildResearchPipelineGraph();
    const threadId = `pipeline-rerank-thread-${randomUUID()}`;
    const runId = randomUUID();

    const result = await graph.invoke(
      {
        targetUrl: "https://example.com",
        runId,
        query: "What is this domain used for?",
      },
      { configurable: { thread_id: threadId } }
    );

    expect(result.retrievedChunks).not.toBeNull();
    expect(result.retrievedChunks!.length).toBeGreaterThan(0);
    expect(result.retrievedChunks![0].relevanceScore).toBeGreaterThan(0);

    expect(result.retrievedContext).not.toBeNull();
    expect(result.retrievedContext!.contextText.length).toBeGreaterThan(0);
  }, 60000);
});