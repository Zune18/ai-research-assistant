import { Queue } from "bullmq";
import { connection } from "./demo-queue";
import type { RunId } from "../types";

export interface ResearchJobData {
  runId: RunId;
  topic: string;
}

export const researchQueue = new Queue<ResearchJobData>("research-queue", { connection });

/**
 * Adds a research run to the queue. This is what Fastify API
 * will call when a user submits a new research topic
 */
export async function enqueueResearchRun(runId: RunId, topic: string) {
  return researchQueue.add("run-research", { runId, topic });
}