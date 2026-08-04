import { Worker, Job } from "bullmq";
import { connection } from "./demo-queue";
import type { ResearchJobData } from "./research-queue";
import { buildDemoGraph } from "../graph/demo-graph";
import { db } from "../db/postgres/client";
import { runs } from "../db/postgres/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "../utils/logger";

const log = createLogger({ component: "ResearchWorker" });

/**
 * Processes queued research run jobs by invoking the graph, using runId as
 * the thread_id, triggered by a queued job
 */
export function buildResearchWorker() {
  return new Worker<ResearchJobData>(
    "research-queue",
    async (job: Job<ResearchJobData>) => {
      const { runId, topic } = job.data;
      log.info({ runId, topic }, "Processing research job");

      await job.updateProgress({ percent: 0, stage: "starting" });

      const graph = buildDemoGraph();
      const config = { configurable: { thread_id: runId } };

      try {
        await job.updateProgress({ percent: 50, stage: "running graph" });

        const result = await graph.invoke({}, config);

        await job.updateProgress({ percent: 100, stage: "completed" });
        await db.update(runs).set({ status: "completed", updatedAt: new Date() }).where(eq(runs.id, runId));

        return result;
      } catch (err) {
        await db.update(runs).set({ status: "failed", updatedAt: new Date() }).where(eq(runs.id, runId));
        log.error({ runId, err }, "Research job failed");
        throw err;
      }
    },
    { connection, concurrency: 5 }
  );
}