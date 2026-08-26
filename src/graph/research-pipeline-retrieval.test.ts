import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildResearchPipelineGraph } from "./research-pipeline";

describe("Research pipeline: full chain through retrieval", () => {
  it("visits a page, scrapes, embeds, and retrieves relevant context for a query", async () => {
    const graph = buildResearchPipelineGraph();
    const threadId = `pipeline-full-thread-${randomUUID()}`;
    const runId = randomUUID();

    const result = await graph.invoke(
      {
        targetUrl: "https://example.com",
        runId,
        query: "What is this domain used for?",
      },
      { configurable: { thread_id: threadId } }
    );

    expect(result.chunksUpserted).toBeGreaterThan(0);
    expect(result.retrievedContext).not.toBeNull();
    expect(result.retrievedContext!.contextText.length).toBeGreaterThan(0);
    expect(result.retrievedContext!.sources.length).toBeGreaterThan(0);
    expect(result.retrievedContext!.sources[0].url).toBe("https://example.com");
  }, 60000);
});