import { describe, it, expect } from "vitest";
import { buildContext } from "./build-context";
import type { RetrievedChunk } from "./search";

const mockChunk = (overrides: Partial<RetrievedChunk>): RetrievedChunk => ({
  id: "id",
  score: 0.9,
  text: "some content",
  url: "https://example.com",
  title: "Example Title",
  chunkIndex: 0,
  ...overrides,
});

describe("buildContext", () => {
  it("assigns the same source number to multiple chunks from the same URL", () => {
    const chunks = [
      mockChunk({ url: "https://example.com/a", title: "Article A", text: "First chunk of A" }),
      mockChunk({ url: "https://example.com/a", title: "Article A", text: "Second chunk of A" }),
      mockChunk({ url: "https://example.com/b", title: "Article B", text: "Chunk of B" }),
    ];

    const result = buildContext(chunks);

    expect(result.sources).toHaveLength(2); // deduplicated
    expect(result.contextText).toContain("[Source 1: Article A]\nFirst chunk of A");
    expect(result.contextText).toContain("[Source 1: Article A]\nSecond chunk of A");
    expect(result.contextText).toContain("[Source 2: Article B]\nChunk of B");
  });

  it("separates chunks with a clear delimiter", () => {
    const chunks = [
      mockChunk({ url: "https://example.com/a", text: "Chunk one" }),
      mockChunk({ url: "https://example.com/b", text: "Chunk two" }),
    ];

    const result = buildContext(chunks);
    expect(result.contextText).toContain("---");
  });

  it("falls back to the URL as the label when title is empty", () => {
    const chunks = [mockChunk({ url: "https://example.com/no-title", title: "", text: "content" })];
    const result = buildContext(chunks);
    expect(result.contextText).toContain("[Source 1: https://example.com/no-title]");
  });

  it("returns empty context and sources for an empty chunk list", () => {
    const result = buildContext([]);
    expect(result.sources).toHaveLength(0);
    expect(result.contextText).toBe("");
  });
});