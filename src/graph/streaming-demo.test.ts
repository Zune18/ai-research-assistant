import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { runWithUpdates } from "./streaming-demo";

describe("graph.stream() with streamMode: updates", () => {
  it("emits one chunk per node, in execution order", async () => {
    const threadId = `stream-thread-${randomUUID()}`;

    const chunks = await runWithUpdates(threadId);

    // Two nodes in the demo graph -> two chunks
    expect(chunks).toHaveLength(2);

    // First chunk is stepOne's output, keyed by node name
    expect(chunks[0]).toHaveProperty("stepOne");
    expect(chunks[0].stepOne).toMatchObject({ count: 1, log: ["stepOne ran"] });

    // Second chunk is stepTwo's output
    expect(chunks[1]).toHaveProperty("stepTwo");
    expect(chunks[1].stepTwo).toMatchObject({ count: 2, log: ["stepTwo ran"] });
  });

  it("streamed final state matches what invoke() would have returned", async () => {
    const threadId = `stream-thread-${randomUUID()}`;

    const chunks = await runWithUpdates(threadId);

    // Reconstruct final count from the last chunk emitted
    const lastChunk = chunks[chunks.length - 1];
    const lastNodeOutput = Object.values(lastChunk)[0] as { count: number };

    expect(lastNodeOutput.count).toBe(2); // same final value invoke() would give
  });
});