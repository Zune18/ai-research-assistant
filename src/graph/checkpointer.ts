import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { env } from "../config/env";


// Shared Postgres-backed checkpointer for the whole app.
export const checkpointer = PostgresSaver.fromConnString(env.DATABASE_URL);

/**
 * Creates the checkpointer's required tables if they dont exist yet.
 * Must be called once before the checkpointer is used — idempotent.
 */
export async function ensureCheckpointerReady(): Promise<void> {
  await checkpointer.setup();
}