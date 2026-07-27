import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "./server";
import type { FastifyInstance } from "fastify";

describe("SSE streaming endpoint", () => {
  let app: FastifyInstance;
  let baseUrl: string;

  beforeAll(async () => {
    app = buildServer();
    await app.listen({ port: 0, host: "127.0.0.1" }); // port 0 = random free port
    const address = app.server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("streams multiple SSE token events ending in [DONE]", async () => {
    const response = await fetch(`${baseUrl}/stream-demo`);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    let raw = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += decoder.decode(value);
    }

    const messages = raw
      .split("\n\n")
      .filter((line) => line.trim().startsWith("data: "))
      .map((line) => line.replace(/^data: /, "").trim());

    expect(messages.length).toBeGreaterThan(1);
    expect(messages[messages.length - 1]).toBe("[DONE]");

    const tokenMessages = messages.slice(0, -1).map((m) => JSON.parse(m));
    const assembled = tokenMessages.map((m) => m.token).join("");
    expect(assembled.length).toBeGreaterThan(0);
  }, 20000);
});