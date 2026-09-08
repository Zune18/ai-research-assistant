import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildSupervisorDemoGraph } from "./supervisor-demo";

describe("Subgraph embedding: outer graph invoking research-pipeline as a unit", () => {
  it("maps outer state into the subgraph and returns a narrow summary", async () => {
    const graph = buildSupervisorDemoGraph();
    const threadId = `supervisor-demo-thread-${randomUUID()}`;
    const runId = randomUUID();

    const result = await graph.invoke(
      {
        urlToProcess: "https://example.com",
        runId,
        researchQuery: "What is this domain used for?",
      },
      { configurable: { thread_id: threadId } }
    );

    expect(result.finalSummary).toContain("Processed https://example.com");
    expect(result.finalSummary).toContain("source(s)");

    // Prove encapsulation: the outer graph's final state has NO fields
    // from the subgraph's internal state (no browserResult, scrapedContent, etc.)
    expect(result).not.toHaveProperty("browserResult");
    expect(result).not.toHaveProperty("scrapedContent");
  }, 60000);
});