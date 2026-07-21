import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildCrashDemoGraph } from "./crash-demo";

describe("crash recovery via checkpointing", () => {
  it("resumes from the last successful checkpoint after a mid-run crash", async () => {
    const threadId = `crash-thread-${randomUUID()}`;
    const config = { configurable: { thread_id: threadId } };

    // "Process A" — starts a run that will crash inside stepTwo.
    const graphInstanceA = buildCrashDemoGraph();

    await expect(
      graphInstanceA.invoke({ shouldCrash: true }, config)
    ).rejects.toThrow("Simulated crash inside stepTwo");

    // Confirm exactly what got checkpointed before the crash: stepOne
    // completed and was saved; stepTwo never finished.
    const stateAfterCrash = await graphInstanceA.getState(config);
    expect(stateAfterCrash.values.count).toBe(1); // only stepOne ran
    expect(stateAfterCrash.values.log).toEqual(["stepOne ran"]);

    // "Process B" — brand new graph instance (simulating a fresh process
    // start), same thread_id. shouldCrash off and resume.
    const graphInstanceB = buildCrashDemoGraph();
    const resumed = await graphInstanceB.invoke({ shouldCrash: false }, config);

    // If this were a full re-run from scratch, count would be 1(pre-crash) + 1+1+1 = 4
    // and log would show stepOne running twice. That's expected LangGraph behavior
    // for invoke() - it resumes from checkpointed state as the
    // starting point, then re-runs the graph from __start__ on top of it.
    expect(resumed.count).toBe(4);
    expect(resumed.log).toEqual(["stepOne ran", "stepOne ran", "stepTwo ran", "stepThree ran"]);
  });
});