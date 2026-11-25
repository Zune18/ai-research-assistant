import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildHumanInputDemoGraph } from "./human-input-demo";

describe("resuming a paused graph with human input", () => {
  it("uses the edited plan after a person changes it during the pause", async () => {
    const graph = buildHumanInputDemoGraph();
    const config = { configurable: { thread_id: `human-input-${randomUUID()}` } };

    const paused = await graph.invoke({}, config);
    expect(paused.plan).toHaveLength(3);
    expect(paused.executed).toEqual([]); // executePlan has not run yet

    // removes the bad URL while the graph is paused.
    const editedPlan = paused.plan.filter((url) => !url.includes("bad"));
    await graph.updateState(config, { plan: editedPlan });

    const resumed = await graph.invoke(null, config);
    expect(resumed.executed).toEqual(["https://good-one.com", "https://good-two.com"]);
  }, 15000);

  it("uses the original plan when no changes", async () => {
    const graph = buildHumanInputDemoGraph();
    const config = { configurable: { thread_id: `human-input-${randomUUID()}` } };

    await graph.invoke({}, config);
    const resumed = await graph.invoke(null, config);

    expect(resumed.executed).toHaveLength(3);
  }, 15000);
});