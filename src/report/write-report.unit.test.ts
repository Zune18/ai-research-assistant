import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../llm/openrouter", () => ({
  chatJSON: vi.fn(),
  chatText: vi.fn(),
}));

import { chatText } from "../llm/openrouter";
import { writeReport } from "./write-report";
import type { BuiltContext } from "../retrieval/build-context";

const context: BuiltContext = {
  contextText: "[Source 1: Llama Facts]\nLlamas carry goods.",
  sources: [{ url: "https://example.com/llamas", title: "Llama Facts" }],
};

describe("writeReport (mocked LLM)", () => {
  beforeEach(() => {
    vi.mocked(chatText).mockReset();
  });

  it("puts the question, the context and the key rules in the prompt", async () => {
    vi.mocked(chatText).mockResolvedValue("# Report");

    await writeReport("What are llamas used for?", context);

    const [prompt] = vi.mocked(chatText).mock.calls[0];
    expect(prompt).toContain("What are llamas used for?");
    expect(prompt).toContain(context.contextText);
    expect(prompt).toContain("[Source 1]");
    expect(prompt).toContain("Do not invent");
  });

  it("returns the model's text as markdown, with the sources kept separate", async () => {
    vi.mocked(chatText).mockResolvedValue("# Llamas\n\nThey carry goods [Source 1].");

    const result = await writeReport("q", context);

    expect(result.markdown).toBe("# Llamas\n\nThey carry goods [Source 1].");
    expect(result.sources).toEqual(context.sources);
  });

  it("passes the error on when the LLM call fails", async () => {
    vi.mocked(chatText).mockRejectedValue(new Error("llm down"));

    await expect(writeReport("q", context)).rejects.toThrow("llm down");
  });
});