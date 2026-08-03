import { Worker, Job } from "bullmq";
import { connection } from "./demo-queue";
import { createLogger } from "../utils/logger";

const log = createLogger({ component: "DemoWorker" });

/**
 * A worker watches "demo-queue" and runs this function for every job added to it.
 * This is NOT started automatically on import — buildDemoWorker() must be
 * called explicitly
 */
export function buildDemoWorker() {
  return new Worker(
    "demo-queue",
    async (job: Job) => {
      log.info({ jobId: job.id, data: job.data }, "Processing job");
      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { processed: true, receivedTopic: job.data.topic };
    },
    { connection }
  );
}