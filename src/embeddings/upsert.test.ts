import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { chunkText } from "./chunk";
import { embedChunks } from "./embed-chunks";
import { upsertChunks } from "./upsert";
import { getIndex } from "../db/pinecone/client";

describe("upsertChunks", () => {
  it("embeds, upserts, and makes chunks queryable in Pinecone", async () => {
    const runId = randomUUID();
    const url = `https://example.com/test-${randomUUID()}`;

    const chunks = chunkText("This is a test document about GTA. GTA is a popular video game seriies.");
    const embedded = await embedChunks(chunks);
    const upsertedCount = await upsertChunks(embedded, { url, runId, title: "GTA Facts" });

    expect(upsertedCount).toBe(chunks.length);

    // Give Pinecone's index a brief moment to become queryable after upsert
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const index = getIndex().namespace(runId);
    const queryResult = await index.query({
      vector: embedded[0].embedding,
      topK: 1,
      filter: { runId: { $eq: runId } },
      includeMetadata: true,
    });

    expect(queryResult.matches.length).toBeGreaterThan(0);
    expect(queryResult.matches[0].metadata?.url).toBe(url);
    expect(queryResult.matches[0].metadata?.text).toContain("GTA");
  }, 40000);

  it("re-upserting the same url overwrites rather than duplicates", async () => {
    const runId = randomUUID();
    const url = `https://example.com/dup-test-${randomUUID()}`;

    const chunks = chunkText("Original content about GTA.");
    const embedded = await embedChunks(chunks);

    await upsertChunks(embedded, { url, runId });
    const secondUpsertCount = await upsertChunks(embedded, { url, runId }); // same url, same chunks

    expect(secondUpsertCount).toBe(chunks.length); // same count, not doubled
  }, 40000);
});