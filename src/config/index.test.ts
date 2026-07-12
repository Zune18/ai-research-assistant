import { describe, it, expect } from "vitest";
import { config, createLogger } from "./index";

describe("config wiring", () => {
  it("exposes a validated env object", () => {
    expect(config.env).toBeDefined();
    expect(typeof config.env.PORT).toBe("number");
    expect(typeof config.env.OPENROUTER_API_KEY).toBe("string");
  });

  it("exposes a working root logger", () => {
    expect(config.logger).toBeDefined();
    expect(typeof config.logger.info).toBe("function");
  });

  it("still allows creating independently scoped child loggers", () => {
    const scoped = createLogger({ agent: "PlannerAgent", runId: "run-1" });
    expect(typeof scoped.info).toBe("function");
  });
});