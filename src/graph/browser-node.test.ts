import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildBrowserGraph } from "./browser-node";

describe("Browser Agent as a LangGraph node", () => {
  it("visits a URL and returns the page title and screenshot path", async () => {
    const graph = buildBrowserGraph();
    const threadId = `browser-thread-${randomUUID()}`;

    const result = await graph.invoke(
      { targetUrl: "https://example.com" },
      { configurable: { thread_id: threadId } }
    );

    expect(result.result).not.toBeNull();
    expect(result.result!.title).toContain("Example Domain");
    expect(result.result!.url).toBe("https://example.com");
    expect(result.result!.screenshotPath).toContain("browser-node-");
  }, 30000);

  it("persists the result via checkpointing, retrievable via getState", async () => {
    const graph = buildBrowserGraph();
    const threadId = `browser-thread-${randomUUID()}`;

    await graph.invoke(
      { targetUrl: "https://example.com" },
      { configurable: { thread_id: threadId } }
    );

    const state = await graph.getState({ configurable: { thread_id: threadId } });
    expect(state.values.result.title).toContain("Example Domain");
  }, 30000);
});