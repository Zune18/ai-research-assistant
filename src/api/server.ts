import Fastify from "fastify";
import { env } from "../config/env";
import { createLogger } from "../utils/logger";
import { streamChatText } from "../llm/stream-chat";

const log = createLogger({ component: "ApiServer" });

export function buildServer() {
  const app = Fastify({ logger: false });

  // SSE endpoint: streams tokens from an LLM call directly to the clientas they arrive
  app.get("/stream-demo", async (request, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const prompt = "Write one short sentence about the ocean.";

    try {
      await streamChatText(prompt, (token) => {
        // SSE wire format: each message is "data: <payload>\n\n"
        reply.raw.write(`data: ${JSON.stringify({ token })}\n\n`);
      });

      reply.raw.write(`data: [DONE]\n\n`);
    } catch (err) {
      log.error({ err }, "Streaming failed");
      reply.raw.write(`data: ${JSON.stringify({ error: "stream failed" })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });

  return app;
}

export async function startServer() {
  const app = buildServer();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  log.info({ port: env.PORT }, "Server listening");
  return app;
}