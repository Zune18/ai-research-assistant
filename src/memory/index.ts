import { db } from "../db/postgres/client";
import { redis } from "../db/redis/client";
import { getIndex, ensureIndexExists } from "../db/pinecone/client";

/**
 * Unified memory interface
 * Agents import `memory` from here instead of reaching into db/* directly.
 */
export const memory = {
  structured: db, // Postgres — permanent, structured history (runs, later: sources, reports)
  shortTerm: redis, // Redis — shortterm session/progress data
  semantic: {
    index: getIndex, // Pinecone — embeddings/semantic search
    ensureReady: ensureIndexExists,
  },
};