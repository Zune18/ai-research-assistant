import { describe, it, expect } from "vitest";
import { rerankChunks } from "./rerank-chunks";
import type { RetrievedChunk } from "../retrieval/search";

const mockChunk = (overrides: Partial<RetrievedChunk>): RetrievedChunk => ({
  id: "id",
  score: 0.5,
  text: "content",
  url: "https://example.com",
  title: "Title",
  chunkIndex: 0,
  ...overrides,
});

describe("rerankChunks", () => {
  it("truncates to keepTopN, keeping the most relevant chunks", async () => {
    const chunks = [
      mockChunk({ text: "Unrelated content about cooking pasta recipes.", url: "https://example.com/pasta" }),
      mockChunk({ text: "Green tea contains antioxidants that support heart health.", url: "https://example.com/tea" }),
      mockChunk({ text: "The weather forecast predicts rain tomorrow afternoon.", url: "https://example.com/weather" }),
    ];

    const result = await rerankChunks("What are the health benefits of green tea?", chunks, 1);

    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://example.com/tea");
    expect(result[0].relevanceScore).toBeGreaterThan(0);
  }, 20000);

  it("preserves original chunk metadata after reranking", async () => {
    const chunks = [
      mockChunk({ text: "Relevant content about solar panels.", url: "https://example.com/solar", title: "Solar Info", chunkIndex: 3 }),
    ];

    const result = await rerankChunks("solar panel efficiency", chunks, 5);

    expect(result[0].url).toBe("https://example.com/solar");
    expect(result[0].title).toBe("Solar Info");
    expect(result[0].chunkIndex).toBe(3);
  }, 20000);

  it("returns an empty array when given no chunks", async () => {
    const result = await rerankChunks("any query", [], 5);
    expect(result).toEqual([]);
  });
});