import { describe, it, expect } from "vitest";
import { streamChatText } from "./stream-chat";

describe("OpenRouter token streaming", () => {
  it("receives multiple tokens and assembles them into the full response", async () => {
    const tokens: string[] = [];

    const fullText = await streamChatText(
      "Reply with exactly the sentence: The quick brown fox jumps.",
      (token) => tokens.push(token)
    );

    // Streaming should give us more than one chunk for a multi-word response
    expect(tokens.length).toBeGreaterThan(1);

    // The assembled text should match what onToken pieces concatenate to
    expect(fullText).toBe(tokens.join(""));

    // Sanity check the content is roughly what we asked for
    expect(fullText.toLowerCase()).toContain("fox");
  }, 20000);
});