import { describe, it, expect, afterAll } from "vitest";
import { redis } from "./client";

describe("redis connection", () => {
  it("can set and get a value", async () => {
    await redis.set("test:key", "hello");
    const value = await redis.get("test:key");

    expect(value).toBe("hello");

    await redis.del("test:key");
  });

  it("returns null for a missing key", async () => {
    const value = await redis.get("test:key:does-not-exist");
    expect(value).toBeNull();
  });

  afterAll(async () => {
    await redis.quit();
  });
});