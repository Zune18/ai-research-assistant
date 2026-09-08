import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildSupervisorGraph } from "./supervisor";

describe("Supervisor: conditional routing across multiple URLs", () => {
  it("processes every URL in the list, one at a time, then stops", async () => {
    const graph = buildSupervisorGraph();
    const threadId = `supervisor-thread-${randomUUID()}`;
    const runId = randomUUID();

    const result = await graph.invoke(
      {
        urlsToProcess: ["https://example.com", "https://example.org"],
        runId,
        researchQuery: "What is this domain used for?",
      },
      { configurable: { thread_id: threadId } }
    );

    expect(result.summaries).toHaveLength(2);
    expect(result.summaries[0]).toContain("example.com");
    expect(result.summaries[1]).toContain("example.org");
    expect(result.currentIndex).toBe(2);
  }, 90000);

  it("stops immediately with an empty URL list", async () => {
    const graph = buildSupervisorGraph();
    const threadId = `supervisor-thread-${randomUUID()}`;

    const result = await graph.invoke(
      { urlsToProcess: [], runId: randomUUID(), researchQuery: "test" },
      { configurable: { thread_id: threadId } }
    );

    expect(result.summaries).toHaveLength(0);
  });
});