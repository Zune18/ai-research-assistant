import { describe, it, expect } from "vitest";
import { startRun, getRunDetails } from "./run-manager";
import { db } from "../db/postgres/client";
import { runs } from "../db/postgres/schema";
import { eq } from "drizzle-orm";

describe("run manager — thread_id tied to runs table", () => {
  it("creates a run row and ties it to the graph's thread_id", async () => {
    const runId = await startRun("test topic for thread_id linkage");

    const details = await getRunDetails(runId);

    expect(details).not.toBeNull();
    expect(details!.run.topic).toBe("test topic for thread_id linkage");
    expect(details!.run.status).toBe("completed");
    expect(details!.graphState.count).toBe(2); // same demo graph, ran once

    // cleanup
    await db.delete(runs).where(eq(runs.id, runId));
  });

  it("returns null for a run id that doesn't exist", async () => {
    const details = await getRunDetails("00000000-0000-0000-0000-000000000000");
    expect(details).toBeNull();
  });
});