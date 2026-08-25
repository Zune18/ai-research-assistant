import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildResearchPipelineGraph } from "./research-pipeline";

describe("Research pipeline: Browser Agent -> Scraper Agent", () => {
  it("visits a real page and produces clean markdown from it end-to-end", async () => {
    const graph = buildResearchPipelineGraph();
    const threadId = `pipeline-thread-${randomUUID()}`;

    const result = await graph.invoke(
      { targetUrl: "https://example.com" },
      { configurable: { thread_id: threadId } }
    );

    expect(result.browserResult).not.toBeNull();
    expect(result.browserResult!.html).toContain("<html");

    expect(result.scrapedContent).not.toBeNull();
    expect(result.scrapedContent!.markdown.length).toBeGreaterThan(0);
    expect(result.scrapedContent!.canonicalUrl).toBe("https://example.com");
  }, 30000);

  it("persists both browser and scraper results via checkpointing", async () => {
    const graph = buildResearchPipelineGraph();
    const threadId = `pipeline-thread-${randomUUID()}`;

    await graph.invoke(
      { targetUrl: "https://example.com" },
      { configurable: { thread_id: threadId } }
    );

    const state = await graph.getState({ configurable: { thread_id: threadId } });
    expect(state.values.browserResult).not.toBeNull();
    expect(state.values.scrapedContent).not.toBeNull();
  }, 30000);
});