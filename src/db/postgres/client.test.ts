import { describe, it, expect, afterAll } from "vitest";
import { db } from "./client";
import { runs } from "./schema";
import { eq } from "drizzle-orm";

describe("postgres connection + runs table", () => {
  it("inserts and retrieves a run", async () => {
    const [inserted] = await db
      .insert(runs)
      .values({ topic: "test topic" })
      .returning();

    expect(inserted.id).toBeDefined();
    expect(inserted.topic).toBe("test topic");
    expect(inserted.status).toBe("pending");

    const [fetched] = await db.select().from(runs).where(eq(runs.id, inserted.id));
    expect(fetched.topic).toBe("test topic");

    // cleanup
    await db.delete(runs).where(eq(runs.id, inserted.id));
  });

  afterAll(async () => {
    // vitest keeps process alive if pg pool isn't closed
  });
});