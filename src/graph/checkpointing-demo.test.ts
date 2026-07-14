import { describe, it, expect } from "vitest";
import { buildDemoGraph } from "./checkpointing-demo";

describe("MemorySaver checkpointing behavior", () => {
    it("persists state across multiple invokes with the same thread_id", async () => {
        const graph = buildDemoGraph();
        const config = { configurable: { thread_id: "thread-a" } };

        const first = await graph.invoke({}, config);
        expect(first.count).toBe(2); // stepOne + stepTwo both ran once

        // Invoke AGAIN with the same thread_id — the checkpoint's count (2) is the
        // starting point, and both nodes run again on top of it: 2 -> 3 -> 4
        const second = await graph.invoke({}, config);
        expect(second.count).toBe(4);

        // log reducer appends — so the log should have grown across both invokes
        expect(second.log.length).toBeGreaterThan(first.log.length);
    });

    it("starts fresh for a different thread_id", async () => {
        const graph = buildDemoGraph();

        await graph.invoke({}, { configurable: { thread_id: "thread-b" } });

        const freshThread = await graph.invoke(
            {},
            { configurable: { thread_id: "thread-c" } }
        );

        // thread-c has never run before, so its log should only have this one runs entries
        expect(freshThread.log).toEqual(["stepOne ran", "stepTwo ran"]);
    });

    it("can inspect the saved checkpoint state directly via getState", async () => {
        const graph = buildDemoGraph();
        const config = { configurable: { thread_id: "thread-d" } };

        await graph.invoke({}, config);

        const state = await graph.getState(config);
        expect(state.values.count).toBe(2);
    });
});