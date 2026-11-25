import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { buildHandoffSupervisorGraph } from "./handoff-supervisor";

function newConfig() {
  return { configurable: { thread_id: `handoff-thread-${randomUUID()}` } };
}

describe("Handoff supervisor with human approval", () => {
  it("pauses before processing any URL", async () => {
    const graph = buildHandoffSupervisorGraph();
    const config = newConfig();

    const paused = await graph.invoke(
      {
        candidateUrls: ["https://example.com", "https://example.org"],
        runId: randomUUID(),
        researchQuery: "What is this domain used for?",
      },
      config
    );

    expect(paused.iterationCount).toBe(0);
    expect(paused.summaries).toEqual([]);
    expect(paused.report).toBeNull();

    const state = await graph.getState(config);
    expect(state.next).toEqual(["reviewPlan"]);
  }, 15000);

  it("uses the edited URL list after a person changes it during the pause", async () => {
    const graph = buildHandoffSupervisorGraph();
    const config = newConfig();

    await graph.invoke(
      {
        candidateUrls: ["https://example.com", "https://example.org"],
        runId: randomUUID(),
        researchQuery: "What is this domain used for?",
      },
      config
    );

    // The person removes example.org while the graph is paused.
    await graph.updateState(config, { candidateUrls: ["https://example.com"] });

    const resumed = await graph.invoke(null, config);

    expect(resumed.summaries.length).toBeGreaterThan(0);
    expect(resumed.summaries.every((s) => s.includes("example.com"))).toBe(true);
    expect(resumed.summaries.some((s) => s.includes("example.org"))).toBe(false);
  }, 150000);

  it("runs the full pipeline and writes a report when approved without changes", async () => {
    const graph = buildHandoffSupervisorGraph();
    const config = newConfig();

    await graph.invoke(
      {
        candidateUrls: ["https://example.com", "https://example.org", "https://example.net"],
        runId: randomUUID(),
        researchQuery: "What is this domain used for?",
      },
      config
    );

    const resumed = await graph.invoke(null, config);

    expect(resumed.iterationCount).toBeGreaterThanOrEqual(1);
    expect(resumed.iterationCount).toBeLessThanOrEqual(3);
    expect(resumed.report).not.toBeNull();

    const htmlStat = await fs.stat(resumed.reportHtmlPath!);
    const pdfStat = await fs.stat(resumed.reportPdfPath!);
    expect(htmlStat.size).toBeGreaterThan(0);
    expect(pdfStat.size).toBeGreaterThan(0);
  }, 150000);
});