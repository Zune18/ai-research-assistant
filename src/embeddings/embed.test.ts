import { describe, it, expect } from "vitest";
import { embedText, EMBEDDING_DIMENSION } from "./embed";

describe("embedText via OpenRouter (nemotron-3-embed-1b:free)", () => {
  it("returns a vector of the expected dimension", async () => {
    const vector = await embedText("The quick brown fox jumps over the lazy dog.");

    expect(vector).toHaveLength(EMBEDDING_DIMENSION);
    expect(vector.every((n) => typeof n === "number")).toBe(true);
  }, 15000);

  it("produces similar embeddings for semantically similar text", async () => {
    const a = await embedText("The cat sat on the mat.");
    const b = await embedText("A feline was resting on the rug.");
    const c = await embedText("Quantum physics governs subatomic particles.");

    const cosineSim = (v1: number[], v2: number[]) => {
      const dot = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
      const magA = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0));
      const magB = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0));
      return dot / (magA * magB);
    };

    expect(cosineSim(a, b)).toBeGreaterThan(cosineSim(a, c));
  }, 20000);
});