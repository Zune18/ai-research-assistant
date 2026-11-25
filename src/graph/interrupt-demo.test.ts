import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildInterruptDemoGraph } from "./interrupt-demo";

describe("interrupt_before pauses a graph at a chosen node", () => {
  it("stops before stepTwo runs, then continues when invoked again", async () => {
    const graph = buildInterruptDemoGraph();
    const threadId = `interrupt-thread-${randomUUID()}`;
    const config = { configurable: { thread_id: threadId } };

    // First call: only stepOne should run
    const paused = await graph.invoke({}, config);
    expect(paused.count).toBe(1);
    expect(paused.log).toEqual(["stepOne ran"]);

    const state = await graph.getState(config);
    expect(state.next).toEqual(["stepTwo"]); // "next" tells us what would run next

    // Second call, same thread_id, no new input: resumes from the pause point.
    const resumed = await graph.invoke(null, config);
    expect(resumed.count).toBe(2);
    expect(resumed.log).toEqual(["stepOne ran", "stepTwo ran"]);
  }, 15000);
});