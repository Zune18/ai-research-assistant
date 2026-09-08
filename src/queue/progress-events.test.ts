import { describe, it, expect, afterAll } from "vitest";
import { enqueueResearchRun, researchQueue } from "./research-queue";
import { buildResearchWorker } from "./research-worker";
import { QueueEvents } from "bullmq";
import { connection } from "./demo-queue";
import { db } from "../db/postgres/client";
import { runs } from "../db/postgres/schema";
import { eq } from "drizzle-orm";

it("emits progress updates as the job runs, ending at 100%", async () => {
  const [run] = await db.insert(runs).values({ topic: "progress test", status: "pending" }).returning();

  const worker = buildResearchWorker();
  const queueEvents = new QueueEvents("research-queue", { connection });
  await queueEvents.waitUntilReady();

  const progressUpdates: Array<{ percent: number; stage: string }> = [];

  let resolveCompletion: () => void;
  const completionReceived = new Promise<void>((resolve) => {
    resolveCompletion = resolve;
  });

  queueEvents.on("progress", ({ data }) => {
    const update = data as { percent: number; stage: string };
    progressUpdates.push(update);
    if (update.percent === 100) {
      resolveCompletion();
    }
  });

  const job = await enqueueResearchRun(run.id, run.topic);

  await Promise.all([job.waitUntilFinished(queueEvents), completionReceived]);

  expect(progressUpdates.length).toBeGreaterThanOrEqual(2);

  // Assert on PRESENCE, not position, for both boundary events — pub/sub
  // delivery timing means neither is guaranteed to land at a specific index,
  // even with waitUntilReady() called beforehand.
  expect(progressUpdates.some((u) => u.percent === 0 && u.stage === "starting")).toBe(true);
  expect(progressUpdates.some((u) => u.percent === 100 && u.stage === "completed")).toBe(true);

  await db.delete(runs).where(eq(runs.id, run.id));
  await worker.close();
  await queueEvents.close();
}, 15000);