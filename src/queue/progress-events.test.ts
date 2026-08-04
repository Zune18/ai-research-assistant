import { describe, it, expect, afterAll } from "vitest";
import { enqueueResearchRun, researchQueue } from "./research-queue";
import { buildResearchWorker } from "./research-worker";
import { QueueEvents } from "bullmq";
import { connection } from "./demo-queue";
import { db } from "../db/postgres/client";
import { runs } from "../db/postgres/schema";
import { eq } from "drizzle-orm";

describe("job progress events", () => {
  it("emits progress updates as the job runs, ending at 100%", async () => {
    const [run] = await db.insert(runs).values({ topic: "progress test", status: "pending" }).returning();

    const worker = buildResearchWorker();
    const queueEvents = new QueueEvents("research-queue", { connection });

    const progressUpdates: Array<{ percent: number; stage: string }> = [];
    queueEvents.on("progress", ({ data }) => {
      progressUpdates.push(data as { percent: number; stage: string });
    });

    const job = await enqueueResearchRun(run.id, run.topic);
    await job.waitUntilFinished(queueEvents);

    expect(progressUpdates.length).toBeGreaterThanOrEqual(3);
    expect(progressUpdates[0]).toMatchObject({ percent: 0, stage: "starting" });
    expect(progressUpdates[progressUpdates.length - 1]).toMatchObject({
      percent: 100,
      stage: "completed",
    });

    await db.delete(runs).where(eq(runs.id, run.id));
    await worker.close();
    await queueEvents.close();
  }, 15000);

  afterAll(async () => {
    await researchQueue.close();
  });
});