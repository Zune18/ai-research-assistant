import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildSupervisorGraph } from "./supervisor";

describe("Shared vs private state boundary", () => {
  it("outer graph result contains only the shared summary, never subgraph internals", async () => {
    const graph = buildSupervisorGraph();
    const threadId = `boundary-thread-${randomUUID()}`;
    const runId = randomUUID();

    const result = await graph.invoke(
      { urlsToProcess: ["https://example.com"], runId, researchQuery: "test query" },
      { configurable: { thread_id: threadId } }
    );

    expect(result).not.toHaveProperty("browserResult");
    expect(result).not.toHaveProperty("scrapedContent");
    expect(result).not.toHaveProperty("retrievedChunks");
    expect(result).not.toHaveProperty("retrievedContext");

    expect(result.summaries).toHaveLength(1);
    expect(result.summaries[0]).toContain("example.com");
  }, 60000);
});