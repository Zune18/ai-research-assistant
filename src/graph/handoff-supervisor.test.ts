import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { buildHandoffSupervisorGraph } from "./handoff-supervisor";

describe("Handoff supervisor with reflection and report generation", () => {
  it("stops early when reflection judges the research is enough, and writes a report", async () => {
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

    expect(result.iterationCount).toBeLessThanOrEqual(3);
    expect(result.report).not.toBeNull();
    expect(result.reportHtmlPath).not.toBeNull();
    expect(result.reportPdfPath).not.toBeNull();

    const htmlStat = await fs.stat(result.reportHtmlPath!);
    const pdfStat = await fs.stat(result.reportPdfPath!);
    expect(htmlStat.size).toBeGreaterThan(0);
    expect(pdfStat.size).toBeGreaterThan(0);
  }, 150000);

  it("still writes a report when it stops due to running out of URLs", async () => {
    const graph = buildHandoffSupervisorGraph();
    const threadId = `handoff-cap-thread-${randomUUID()}`;
    const runId = randomUUID();

    const result = await graph.invoke(
      {
        candidateUrls: ["https://example.com"],
        runId,
        researchQuery: "test query",
      },
      { configurable: { thread_id: threadId } }
    );

    expect(result.iterationCount).toBe(1);
    expect(result.report).not.toBeNull();
  }, 90000);
});