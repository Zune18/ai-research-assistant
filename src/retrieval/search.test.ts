import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "node:crypto";
import { chunkText } from "../embeddings/chunk";
import { embedChunks } from "../embeddings/embed-chunks";
import { upsertChunks } from "../embeddings/upsert";
import { semanticSearch } from "./search";

describe("semanticSearch", () => {
  const runId = randomUUID();
  const llamaUrl = `https://example.com/llamas-${randomUUID()}`;
  const rocketUrl = `https://example.com/rockets-${randomUUID()}`;

  beforeAll(async () => {
    const llamaChunks = chunkText(
      "Llamas are large domesticated South American camelids, closely related to alpacas and vicuñas. For thousands of years, indigenous Andean cultures have relied on llamas as pack animals, using them to carry goods across mountainous terrain where wheeled vehicles are impractical. Llamas are well-suited to high altitudes and can carry significant loads over long distances."
    );
    const rocketChunks = chunkText(
      "Rocket engines generate thrust by expelling propellant at extremely high velocity, following Newton's third law of motion. Modern rocket propulsion systems, whether liquid-fueled or solid-fueled, must overcome Earth's gravity to reach orbital velocity. Engineers carefully balance thrust, fuel efficiency, and structural weight when designing rocket engines for space launch vehicles."
    );

    const [embeddedLlamas, embeddedRockets] = await Promise.all([
      embedChunks(llamaChunks),
      embedChunks(rocketChunks),
    ]);

    await upsertChunks(embeddedLlamas, { url: llamaUrl, runId, title: "About Llamas" });
    await upsertChunks(embeddedRockets, { url: rocketUrl, runId, title: "About Rockets" });

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }, 60000);

  it("returns the most semantically relevant chunk for a query", async () => {
  const results = await semanticSearch("What animals do Andean people use to carry goods?", runId, 5);

  expect(results.length).toBeGreaterThan(0);
  expect(results[0].url).toBe(llamaUrl);
  expect(results[0].text.toLowerCase()).toContain("llama");
}, 20000);

  it("ranks results by descending similarity score", async () => {
    const results = await semanticSearch("Tell me about rocket propulsion", runId, 5);

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  }, 20000);
});