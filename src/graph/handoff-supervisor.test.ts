import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildHandoffSupervisorGraph } from "./handoff-supervisor";

describe("Handoff supervisor with reflection", () => {
  it("stops early when reflection judges the research is enough", async () => {
    const graph = buildHandoffSupervisorGraph();
    const threadId = `handoff-reflect-thread-${randomUUID()}`;
    const runId = randomUUID();

    const result = await graph.invoke(
      {
        candidateUrls: ["https://example.com", "https://example.org", "https://example.net"],
        runId,
        researchQuery: "What is this domain used for?",
      },
      { configurable: { thread_id: threadId } }
    );

    // Should stop before using every single URL, since reflection can say "enough"
    expect(result.iterationCount).toBeLessThanOrEqual(3);
    expect(result.summaries.length).toBeGreaterThan(0);
  }, 120000);

  it("stops at the hard cap even if reflection keeps saying not enough", async () => {
    const graph = buildHandoffSupervisorGraph();
    const threadId = `handoff-cap-thread-${randomUUID()}`;
    const runId = randomUUID();

    const result = await graph.invoke(
      {
        candidateUrls: ["https://example.com"], // only one URL available
        runId,
        researchQuery: "test query",
      },
      { configurable: { thread_id: threadId } }
    );

    // Should stop because it ran out of URLs, not because of the cap here
    expect(result.iterationCount).toBe(1);
  }, 60000);
});