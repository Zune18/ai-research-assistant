import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "node:crypto";
import { chunkText } from "../embeddings/chunk";
import { embedChunks } from "../embeddings/embed-chunks";
import { upsertChunks } from "../embeddings/upsert";
import { semanticSearch } from "./search";

describe("hybrid search: semantic + metadata filtering", () => {
  const runId = randomUUID();
  const urlOne = `https://example.com/source-one-${randomUUID()}`;
  const urlTwo = `https://example.com/source-two-${randomUUID()}`;

  beforeAll(async () => {
    // Same topic, two different sources — filter should isolate one
    const chunksOne = chunkText("Electric vehicles reduce urban air pollution significantly.");
    const chunksTwo = chunkText("Electric vehicles also reduce noise pollution in cities.");

    const [embeddedOne, embeddedTwo] = await Promise.all([
      embedChunks(chunksOne),
      embedChunks(chunksTwo),
    ]);

    await upsertChunks(embeddedOne, { url: urlOne, runId, title: "Source One" });
    await upsertChunks(embeddedTwo, { url: urlTwo, runId, title: "Source Two" });

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }, 60000);

  it("filters semantic results to only the specified source URL", async () => {
    const results = await semanticSearch("electric vehicles pollution", runId, 10, { url: urlOne });

    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => expect(r.url).toBe(urlOne));
  }, 20000);

  it("returns results from both sources when no filter is applied", async () => {
    const results = await semanticSearch("electric vehicles pollution", runId, 10);

    const urls = new Set(results.map((r) => r.url));
    expect(urls.size).toBeGreaterThanOrEqual(2);
  }, 20000);
});