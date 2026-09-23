import { describe, it, expect } from "vitest";
import { chatText, chatJSON } from "./openrouter";

describe("chatText", () => {
  it("returns a non-empty text reply", async () => {
    const result = await chatText("Reply with exactly one short sentence about the sky.");

    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  }, 30000);
});

describe("chatJSON", () => {
  it("returns a typed object matching the schema", async () => {
    const schema = {
      type: "object",
      properties: {
        animal: { type: "string" },
        legCount: { type: "number" },
      },
      required: ["animal", "legCount"],
    };

    const result = await chatJSON<{ animal: string; legCount: number }>(
      "Give me one common farm animal and how many legs it has.",
      schema
    );

    expect(typeof result.animal).toBe("string");
    expect(typeof result.legCount).toBe("number");
  }, 30000);
});