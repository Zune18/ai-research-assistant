import { describe, it, expect } from "vitest";
import { embedChunks } from "./embed-chunks";
import type { Chunk } from "./chunk";

describe("embedChunks", () => {
  it("embeds multiple chunks and preserves original order", async () => {
    const chunks: Chunk[] = [
      { text: "The sky is blue.", index: 0, tokenCount: 5 },
      { text: "The grass is green.", index: 1, tokenCount: 5 },
      { text: "The sun is bright.", index: 2, tokenCount: 5 },
    ];

    const result = await embedChunks(chunks, 2);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.index)).toEqual([0, 1, 2]);
    result.forEach((r) => {
      expect(r.embedding.length).toBeGreaterThan(0);
    });
  }, 30000);

  it("continues processing remaining chunks if one embedding fails", async () => {
    const chunks: Chunk[] = [
      { text: "Valid text one.", index: 0, tokenCount: 3 },
      { text: "", index: 1, tokenCount: 0 }, // empty text to fail
      { text: "Valid text two.", index: 2, tokenCount: 3 },
    ];

    const result = await embedChunks(chunks, 2);

    // At minimum, the two valid chunks should succeed
    expect(result.length).toBeGreaterThanOrEqual(2);
  }, 30000);
});