import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../llm/openrouter", () => ({
  chatJSON: vi.fn(),
  chatText: vi.fn(),
}));

import { chatJSON } from "../llm/openrouter";
import { reflect } from "./reflect";
import type { BuiltContext } from "../retrieval/build-context";

const context: BuiltContext = {
  contextText: "[Source 1: Page A]\nFact A.\n\n---\n\n[Source 2: Page B]\nFact B.",
  sources: [
    { url: "https://example.com/a", title: "Page A" },
    { url: "https://example.com/b", title: "Page B" },
  ],
};

describe("reflect (mocked LLM)", () => {
  beforeEach(() => {
    vi.mocked(chatJSON).mockReset();
  });

  it("puts the question, the context and the source count in the prompt", async () => {
    vi.mocked(chatJSON).mockResolvedValue({
      isEnough: true,
      gaps: [],
      suggestedNextQuery: null,
      reasoning: "ok",
    });

    await reflect("What is the question?", context);

    const [prompt] = vi.mocked(chatJSON).mock.calls[0];
    expect(prompt).toContain("What is the question?");
    expect(prompt).toContain(context.contextText);
    expect(prompt).toContain("Sources found so far (2)");
  });

  it("sends a schema that requires all four result fields", async () => {
    vi.mocked(chatJSON).mockResolvedValue({
      isEnough: true,
      gaps: [],
      suggestedNextQuery: null,
      reasoning: "ok",
    });

    await reflect("q", context);

    const [, schema] = vi.mocked(chatJSON).mock.calls[0];
    expect(schema).toMatchObject({
      required: ["isEnough", "gaps", "suggestedNextQuery", "reasoning"],
    });
  });

  it("returns exactly what the model answered", async () => {
    const answer = {
      isEnough: false,
      gaps: ["missing costs"],
      suggestedNextQuery: "pricing details",
      reasoning: "no numbers found",
    };
    vi.mocked(chatJSON).mockResolvedValue(answer);

    const result = await reflect("q", context);

    expect(result).toEqual(answer);
  });

  it("passes the error on when the LLM call fails", async () => {
    vi.mocked(chatJSON).mockRejectedValue(new Error("llm down"));

    await expect(reflect("q", context)).rejects.toThrow("llm down");
  });
});