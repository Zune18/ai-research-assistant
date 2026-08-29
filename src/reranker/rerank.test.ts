import { describe, it, expect } from "vitest";
import { rerank } from "./rerank";

describe("rerank via OpenRouter/Local", () => {
  it("scores a clearly relevant document higher than an irrelevant one", async () => {
    const query = "What are the health benefits of drinking green tea?";
    const documents = [
      "Green tea contains antioxidants called catechins, which may help reduce inflammation and support heart health.",
      "The stock market experienced significant volatility during the third quarter due to interest rate changes.",
      "Green tea has been consumed in Asia for centuries and is known for its potential metabolic benefits.",
    ];

    const results = await rerank(query, documents);

    expect(results.length).toBe(documents.length);

    const scoreByIndex = new Map(results.map((r) => [r.index, r.relevanceScore]));

    expect(scoreByIndex.get(0)!).toBeGreaterThan(scoreByIndex.get(1)!);
    expect(scoreByIndex.get(2)!).toBeGreaterThan(scoreByIndex.get(1)!);
  }, 20000);

  it("returns an empty array for an empty document list", async () => {
    const results = await rerank("any query", []);
    expect(results).toEqual([]);
  });
});