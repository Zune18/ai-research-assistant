import { describe, it, expect } from "vitest";
import { writeReport } from "./write-report";
import type { BuiltContext } from "../retrieval/build-context";

describe("writeReport", () => {
  it("writes a report that uses the source content and includes citations", async () => {
    const context: BuiltContext = {
      contextText: `[Source 1: Llama Facts]
Llamas are domesticated South American camelids. They have been used as pack animals by Andean cultures for thousands of years, carrying goods across mountainous terrain.`,
      sources: [{ url: "https://example.com/llamas", title: "Llama Facts" }],
    };

    const result = await writeReport("What are llamas used for?", context);

    expect(result.markdown.length).toBeGreaterThan(0);
    expect(result.markdown.toLowerCase()).toContain("llama");
    expect(result.markdown).toMatch(/\[Source 1\]/);
    expect(result.sources).toEqual(context.sources);
  }, 30000);
});