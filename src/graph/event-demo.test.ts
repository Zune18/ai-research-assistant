import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { runWithFilteredEvents } from "./event-demo";

describe("streamEvents filtering", () => {
  it("emits a start and end event for each of the three nodes, in order", async () => {
    const threadId = `event-thread-${randomUUID()}`;

    const events = await runWithFilteredEvents(threadId);

    // 3 nodes x (start + end) = 6 events
    expect(events).toHaveLength(6);

    expect(events[0]).toEqual({ event: "on_chain_start", name: "stepOne" });
    expect(events[1]).toEqual({ event: "on_chain_end", name: "stepOne" });
    expect(events[2]).toEqual({ event: "on_chain_start", name: "stepTwo" });
    expect(events[3]).toEqual({ event: "on_chain_end", name: "stepTwo" });
    expect(events[4]).toEqual({ event: "on_chain_start", name: "stepThree" });
    expect(events[5]).toEqual({ event: "on_chain_end", name: "stepThree" });
  });
});