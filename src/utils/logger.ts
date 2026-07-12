import pino from "pino";
import { env } from "../config/env";
import type { LogContext } from "../types";

const isDev = env.NODE_ENV === "development";

export const baseLogger = pino({
  level: isDev ? "debug" : "info",
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss",
          ignore: "pid,hostname",
        },
      }
    : undefined, // production: raw JSON
});

/**
 * Creates a child logger scoped with fixed context fields.
 * Every log line from this logger automatically includes `context`.
 *
 * Example:
 *   const log = createLogger({ agent: "ScraperAgent", runId: "abc123" });
 *   log.info("Starting scrape");
 */
export function createLogger(context: LogContext) {
  return baseLogger.child(context);
}