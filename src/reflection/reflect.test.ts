import { describe, it, expect } from "vitest";
import { reflect } from "./reflect";
import type { BuiltContext } from "../retrieval/build-context";

describe("reflect", () => {
  it("says not enough when context is thin and off-topic", async () => {
    const thinContext: BuiltContext = {
      contextText: "[Source 1: Random Page]\nThis page is about cooking pasta.",
      sources: [{ url: "https://example.com/pasta", title: "Random Page" }],
    };

    const result = await reflect(
      "What are the economic effects of rising interest rates?",
      thinContext
    );

    expect(result.isEnough).toBe(false);
    expect(result.gaps.length).toBeGreaterThan(0);
  }, 30000);

  it("says enough when context directly and thoroughly answers the question", async () => {
    const richContext: BuiltContext = {
      contextText: `[Source 1: Interest Rates Explained]
Rising interest rates increase borrowing costs for consumers and businesses, which tends to reduce spending and investment. This can slow economic growth and reduce inflation over time. Higher rates also increase returns on savings accounts and bonds, making them more attractive relative to stocks. Mortgage and loan payments typically rise, reducing disposable income for many households.`,
      sources: [{ url: "https://example.com/rates", title: "Interest Rates Explained" }],
    };

    const result = await reflect(
      "What are the economic effects of rising interest rates?",
      richContext
    );

    expect(result.isEnough).toBe(true);
  }, 30000);
});