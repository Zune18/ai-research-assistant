import { describe, it, expect, afterAll } from "vitest";
import { demoQueue } from "./demo-queue";
import { buildDemoWorker } from "./demo-worker";
import { QueueEvents } from "bullmq";
import { connection } from "./demo-queue";

describe("BullMQ queue + worker basic mechanics", () => {
  it("processes a job added to the queue and returns its result", async () => {
    const worker = buildDemoWorker();
    const queueEvents = new QueueEvents("demo-queue", { connection });

    const job = await demoQueue.add("test-job", { topic: "test topic" });

    // Wait for the job to actually complete, using BullMQ's event-based
    // completion signal rather than polling.
    const result = await job.waitUntilFinished(queueEvents);

    expect(result).toEqual({ processed: true, receivedTopic: "test topic" });

    await worker.close();
    await queueEvents.close();
  }, 10000);

  afterAll(async () => {
    await demoQueue.close();
  });
});