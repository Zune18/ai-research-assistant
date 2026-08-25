import { describe, it, expect } from "vitest";
import { chunkText } from "./chunk";

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    const chunks = chunkText("This is a short paragraph.\n\nAnd a second one.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].index).toBe(0);
  });

  it("splits long text into multiple chunks respecting the token limit", () => {
    const longParagraph = "This is a sentence that will be repeated many times. ".repeat(100);
    const paragraphs = Array(10).fill(longParagraph).join("\n\n");

    const chunks = chunkText(paragraphs, 200, 20);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      expect(chunk.tokenCount).toBeLessThanOrEqual(260);
    });
  });

  it("assigns sequential indices to chunks", () => {
    const longParagraph = "Sentence. ".repeat(200);
    const paragraphs = Array(5).fill(longParagraph).join("\n\n");

    const chunks = chunkText(paragraphs, 100, 10);

    chunks.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
    });
  });

  it("includes overlapping content between consecutive chunks", () => {
    const paragraphs = [
      "First paragraph with unique content Alpha.",
      "Second paragraph with unique content Beta.",
      "Third paragraph with unique content Gamma.",
    ];
    // Force small chunk size - each paragraph becomes its own chunk
    const chunks = chunkText(paragraphs.join("\n\n"), 15, 15);

    if (chunks.length > 1) {
      // The last paragraph of chunk N should reappear at the start of chunk N+1
      const lastLineOfFirst = chunks[0].text.split("\n\n").pop();
      expect(chunks[1].text).toContain(lastLineOfFirst!.slice(0, 20));
    }
  });
});