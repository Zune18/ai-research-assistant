import { Queue } from "bullmq";
import { env } from "../config/env";

/**
 * BullMQ needs a Redis connection config
 * BullMQ manages its own internal connections and has specific requirements
 */
export const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: Number(new URL(env.REDIS_URL).port),
  maxRetriesPerRequest: null,
};

export const demoQueue = new Queue("demo-queue", { connection });