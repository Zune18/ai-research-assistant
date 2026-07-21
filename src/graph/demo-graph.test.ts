import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "node:crypto";
import { buildDemoGraph } from "./demo-graph";
import { ensureCheckpointerReady } from "./checkpointer";

describe("Postgres-backed checkpointing", () => {
  beforeAll(async () => {
    await ensureCheckpointerReady();
  });

  it("persists state in Postgres across separate graph instances", async () => {
    const threadId = `pg-thread-${randomUUID()}`;
    const config = { configurable: { thread_id: threadId } };

    const graphInstanceOne = buildDemoGraph();
    const first = await graphInstanceOne.invoke({}, config);
    expect(first.count).toBe(2);

    const graphInstanceTwo = buildDemoGraph();
    const state = await graphInstanceTwo.getState(config);

    expect(state.values.count).toBe(2);
    expect(state.values.log).toEqual(["stepOne ran", "stepTwo ran"]);
  });

  it("continues correctly from persisted state on the new instance", async () => {
    const threadId = `pg-thread-${randomUUID()}`;
    const config = { configurable: { thread_id: threadId } };

    const graphInstanceOne = buildDemoGraph();
    await graphInstanceOne.invoke({}, config);

    const graphInstanceTwo = buildDemoGraph();
    const second = await graphInstanceTwo.invoke({}, config);

    expect(second.count).toBe(4);
  });
});