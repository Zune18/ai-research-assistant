import { buildResearchWorker } from "./research-worker";
import { createLogger } from "../utils/logger";

const log = createLogger({ component: "WorkerEntrypoint" });

// worker process entrypoint
async function main() {
  const worker = buildResearchWorker();

  worker.on("completed", (job) => {
    log.info({ jobId: job.id }, "Job completed");
  });

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Job failed");
  });

  log.info("Worker process started, waiting for jobs...");

  // Graceful shutdown: let in-flight jobs finish before the process exits,
  // rather than killing them mid-execution when Docker sends SIGTERM.
  process.on("SIGTERM", async () => {
    log.info("SIGTERM received, closing worker gracefully");
    await worker.close();
    process.exit(0);
  });
}

main();