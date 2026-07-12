import { describe, it, expect } from "vitest";
import { createLogger } from "../utils/logger";
import type { AgentName, LogContext } from "./index";

describe("shared types integration with logger", () => {
  it("accepts a valid AgentName in LogContext without type errors", () => {
    const agent: AgentName = "ScraperAgent";
    const context: LogContext = { agent, runId: "run-123" };

    const log = createLogger(context);
    expect(log).toBeDefined();
  });

  it("still allows arbitrary extra fields via the index signature", () => {
    const context: LogContext = {
      agent: "PlannerAgent",
      runId: "run-456",
      customField: "anything",
    };

    const log = createLogger(context);
    expect(log).toBeDefined();
  });
});