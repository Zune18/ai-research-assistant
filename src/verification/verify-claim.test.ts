import { describe, it, expect } from "vitest";
import { verifyClaim } from "./verify-claim";
import type { RerankedChunk } from "../reranker/rerank-chunks";

const mockSource = (overrides: Partial<RerankedChunk>): RerankedChunk => ({
  id: "id",
  score: 0.9,
  relevanceScore: 0.9,
  text: "text",
  url: "https://example.com",
  title: "Title",
  chunkIndex: 0,
  ...overrides,
});

describe("verifyClaim", () => {
  it("marks a claim as supported when a source actually says it", async () => {
    const sources = [
      mockSource({
        url: "https://example.com/tea",
        text: "Green tea contains antioxidants called catechins, which may help reduce inflammation.",
      }),
    ];

    const result = await verifyClaim(
      "Green tea contains antioxidants that may help reduce inflammation.",
      sources
    );

    expect(result.isSupported).toBe(true);
    expect(result.supportingSourceUrl).toBe("https://example.com/tea");
  }, 20000);

  it("marks a claim as unsupported when no source says it", async () => {
    const sources = [
      mockSource({
        url: "https://example.com/tea",
        text: "Green tea contains antioxidants called catechins.",
      }),
    ];

    const result = await verifyClaim(
      "Green tea can cure the common cold within 24 hours.",
      sources
    );

    expect(result.isSupported).toBe(false);
  }, 20000);
});