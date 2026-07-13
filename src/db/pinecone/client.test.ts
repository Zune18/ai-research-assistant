import { describe, it, expect } from "vitest";
import { ensureIndexExists, getIndex, pinecone } from "./client";
import { env } from "../../config/env";

describe("pinecone connection + index setup", () => {
  it("creates the index if missing, and is idempotent on repeat calls", async () => {
    await ensureIndexExists();
    await ensureIndexExists(); // should not throw or duplicate

    const list = await pinecone.listIndexes();
    const found = list.indexes?.some((idx) => idx.name === env.PINECONE_INDEX_NAME);

    expect(found).toBe(true);
  }, 30000); // index creation can take a while, generous timeout

  it("returns a usable index handle", async () => {
    const index = getIndex();
    const stats = await index.describeIndexStats();

    expect(stats).toBeDefined();
    expect(typeof stats.dimension).toBe("number");
  });
});