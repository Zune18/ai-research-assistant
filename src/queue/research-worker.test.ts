import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { enqueueResearchRun, researchQueue } from "./research-queue";
import { buildResearchWorker } from "./research-worker";
import { QueueEvents } from "bullmq";
import { connection } from "./demo-queue";
import { db } from "../db/postgres/client";
import { runs } from "../db/postgres/schema";
import { eq } from "drizzle-orm";

describe("research job queue + worker", () => {
  it("processes a queued research run and marks it completed in Postgres", async () => {
    const [run] = await db.insert(runs).values({ topic: "queued run test", status: "pending" }).returning();

    const worker = buildResearchWorker();
    const queueEvents = new QueueEvents("research-queue", { connection });

    const job = await enqueueResearchRun(run.id, run.topic);
    const result = await job.waitUntilFinished(queueEvents);

    expect(result.count).toBe(2); // demo graph ran once

    const [updatedRun] = await db.select().from(runs).where(eq(runs.id, run.id));
    expect(updatedRun.status).toBe("completed");

    await worker.close();
    await queueEvents.close();
    await db.delete(runs).where(eq(runs.id, run.id));
  }, 15000);

  afterAll(async () => {
    await researchQueue.close();
  });
});