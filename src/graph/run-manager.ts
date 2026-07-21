import { db } from "../db/postgres/client";
import { runs } from "../db/postgres/schema";
import { eq } from "drizzle-orm";
import { buildDemoGraph } from "./demo-graph";
import { createLogger } from "../utils/logger";
import type { RunId } from "../types";

const log = createLogger({ component: "RunManager" });

/**
 * Starts a new research run: creates the Postgres row, then invokes the graph
 * using that row's id as the LangGraph thread_id.
 */
export async function startRun(topic: string): Promise<RunId> {
  const [run] = await db.insert(runs).values({ topic, status: "running" }).returning();

  log.info({ runId: run.id, topic }, "Starting run");

  const graph = buildDemoGraph();
  const config = { configurable: { thread_id: run.id } };

  try {
    await graph.invoke({}, config);
    await db.update(runs).set({ status: "completed", updatedAt: new Date() }).where(eq(runs.id, run.id));
    log.info({ runId: run.id }, "Run completed");
  } catch (err) {
    await db.update(runs).set({ status: "failed", updatedAt: new Date() }).where(eq(runs.id, run.id));
    log.error({ runId: run.id, err }, "Run failed");
    throw err;
  }

  return run.id;
}

/**
 * Fetches both views of a run: the Postgres row and the
 * LangGraph checkpoint state joined by the same id.
 */
export async function getRunDetails(runId: RunId) {
  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run) return null;

  const graph = buildDemoGraph();
  const state = await graph.getState({ configurable: { thread_id: runId } });

  return { run, graphState: state.values };
}