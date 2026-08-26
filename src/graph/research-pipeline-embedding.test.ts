import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildResearchPipelineGraph } from "./research-pipeline";
import { getIndex } from "../db/pinecone/client";

describe("Research pipeline: full chain through embedding", () => {
  it("visits a page, scrapes it, and upserts embedded chunks to Pinecone", async () => {
    const graph = buildResearchPipelineGraph();
    const threadId = `pipeline-embed-thread-${randomUUID()}`;
    const runId = randomUUID();

    const result = await graph.invoke(
      { targetUrl: "https://example.com", runId, query: "test query" },
      { configurable: { thread_id: threadId } }
    );
    expect(result.chunksUpserted).toBeGreaterThan(0);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const index = getIndex();
    const stats = await index.describeIndexStats();
    expect(stats.totalRecordCount).toBeGreaterThan(0);
  }, 60000);
});