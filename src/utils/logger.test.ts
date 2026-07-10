import { describe, it, expect } from "vitest";
import pino from "pino";
import { Writable } from "node:stream";

function createTestLogger(level: string = "debug") {
  const lines: unknown[] = [];

  const stream = new Writable({
    write(chunk, _enc, callback) {
      lines.push(JSON.parse(chunk.toString()));
      callback();
    },
  });

  const logger = pino({ level }, stream);
  return { logger, lines };
}

describe("logger child context behavior", () => {
  it("includes context fields on every log line", () => {
    const { logger, lines } = createTestLogger();
    const child = logger.child({ agent: "ScraperAgent", runId: "abc123" });

    child.info("Starting scrape");

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      agent: "ScraperAgent",
      runId: "abc123",
      msg: "Starting scrape",
    });
  });

  it("respects log level — debug suppressed at info level", () => {
    const { logger, lines } = createTestLogger("info");

    logger.debug("this should not appear");
    logger.info("this should appear");

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ msg: "this should appear" });
  });

  it("child loggers inherit context across multiple log calls", () => {
    const { logger, lines } = createTestLogger();
    const child = logger.child({ agent: "EmbeddingAgent" });

    child.info("Step 1");
    child.warn("Step 2");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ agent: "EmbeddingAgent", msg: "Step 1" });
    expect(lines[1]).toMatchObject({ agent: "EmbeddingAgent", msg: "Step 2" });
  });
});