import { describe, it, expect, afterAll } from "vitest";
import { memory } from "./index";
import { runs } from "../db/postgres/schema";
import { eq } from "drizzle-orm";
import { redis } from "../db/redis/client";

describe("unified memory interface", () => {
  it("structured (Postgres) works through the memory interface", async () => {
    const [inserted] = await memory.structured
      .insert(runs)
      .values({ topic: "memory layer test" })
      .returning();

    expect(inserted.topic).toBe("memory layer test");

    await memory.structured.delete(runs).where(eq(runs.id, inserted.id));
  });

  it("shortTerm (Redis) works through the memory interface", async () => {
    await memory.shortTerm.set("memory:test", "ok");
    const value = await memory.shortTerm.get("memory:test");

    expect(value).toBe("ok");

    await memory.shortTerm.del("memory:test");
  });

  it("semantic (Pinecone) works through the memory interface", async () => {
    await memory.semantic.ensureReady();
    const index = memory.semantic.index();
    const stats = await index.describeIndexStats();

    expect(stats).toBeDefined();
  });

  afterAll(async () => {
    await redis.quit();
  });
});