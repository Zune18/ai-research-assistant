import { env } from "./env";
import { createLogger } from "../utils/logger";

//Single entry point for app-wide config and cross-cutting concerns.
export const config = {
  env,
  logger: createLogger({}), // root logger, no agent/runId context yet
};

// Re-export createLogger directly too, since individual agents/nodes will
// want their OWN scoped child logger (with agent/runId), not just the root one.
export { createLogger } from "../utils/logger";
export type { Env } from "./env";
export type { AgentName, RunId, LogContext } from "../types";