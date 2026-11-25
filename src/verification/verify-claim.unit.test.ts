import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../llm/openrouter", () => ({
  chatJSON: vi.fn(),
  chatText: vi.fn(),
}));

import { chatJSON } from "../llm/openrouter";
import { verifyClaim } from "./verify-claim";
import type { RerankedChunk } from "../reranker/rerank-chunks";

const source = (overrides: Partial<RerankedChunk>): RerankedChunk => ({
  id: "id",
  score: 0.9,
  relevanceScore: 0.9,
  text: "text",
  url: "https://example.com",
  title: "Title",
  chunkIndex: 0,
  ...overrides,
});

describe("verifyClaim (mocked LLM)", () => {
  beforeEach(() => {
    vi.mocked(chatJSON).mockReset();
  });

  it("puts the claim and every labelled source in the prompt", async () => {
    vi.mocked(chatJSON).mockResolvedValue({
      isSupported: true,
      confidence: 0.9,
      supportingSourceUrl: "https://example.com/a",
      reasoning: "ok",
    });

    await verifyClaim("Tea is healthy.", [
      source({ url: "https://example.com/a", text: "Text A" }),
      source({ url: "https://example.com/b", text: "Text B" }),
    ]);

    const [prompt] = vi.mocked(chatJSON).mock.calls[0];
    expect(prompt).toContain('Claim: "Tea is healthy."');
    expect(prompt).toContain("[Source 1: https://example.com/a]\nText A");
    expect(prompt).toContain("[Source 2: https://example.com/b]\nText B");
  });

  it("returns the model's answer together with the original claim", async () => {
    vi.mocked(chatJSON).mockResolvedValue({
      isSupported: false,
      confidence: 0.2,
      supportingSourceUrl: null,
      reasoning: "no source says this",
    });

    const result = await verifyClaim("Tea cures colds.", [source({})]);

    expect(result).toEqual({
      claim: "Tea cures colds.",
      isSupported: false,
      confidence: 0.2,
      supportingSourceUrl: null,
      reasoning: "no source says this",
    });
  });

  it("passes the error on when the LLM call fails", async () => {
    vi.mocked(chatJSON).mockRejectedValue(new Error("llm down"));

    await expect(verifyClaim("claim", [source({})])).rejects.toThrow("llm down");
  });
});