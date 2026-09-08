import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildHandoffSupervisorGraph } from "./handoff-supervisor";

describe("Handoff supervisor with hard iteration cap", () => {
  it("stops as soon as enough chunks are found, without using every candidate URL", async () => {
    const graph = buildHandoffSupervisorGraph();
    const threadId = `handoff-thread-${randomUUID()}`;
    const runId = randomUUID();

    const result = await graph.invoke(
      {
        candidateUrls: ["https://example.com", "https://example.org", "https://example.net"],
        runId,
        researchQuery: "What is this domain used for?",
        minChunksNeeded: 1,
      },
      { configurable: { thread_id: threadId } }
    );

    expect(result.iterationCount).toBeLessThan(3);
    expect(result.totalChunksFound).toBeGreaterThanOrEqual(1);
  }, 90000);

  it("stops at the hard cap even if not enough chunks were ever found", async () => {
    const graph = buildHandoffSupervisorGraph();
    const threadId = `handoff-cap-thread-${randomUUID()}`;
    const runId = randomUUID();

    const result = await graph.invoke(
      {
        candidateUrls: ["https://example.com"],
        runId,
        researchQuery: "test query",
        minChunksNeeded: 999,
      },
      { configurable: { thread_id: threadId } }
    );

    expect(result.iterationCount).toBe(1);
  }, 60000);
});