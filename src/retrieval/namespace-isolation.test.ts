import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "node:crypto";
import { chunkText } from "../embeddings/chunk";
import { embedChunks } from "../embeddings/embed-chunks";
import { upsertChunks } from "../embeddings/upsert";
import { semanticSearch } from "./search";

describe("namespace isolation between runs", () => {
    const runIdA = randomUUID();
    const runIdB = randomUUID();

    beforeAll(async () => {
        const chunksA = chunkText("Run A discusses the history of ancient Rome and its empire.");
        const chunksB = chunkText("Run B discusses modern software engineering practices and agile methodology.");

        const [embeddedA, embeddedB] = await Promise.all([
            embedChunks(chunksA),
            embedChunks(chunksB),
        ]);

        await upsertChunks(embeddedA, { url: "https://example.com/rome", runId: runIdA });
        await upsertChunks(embeddedB, { url: "https://example.com/agile", runId: runIdB });

        await new Promise((resolve) => setTimeout(resolve, 3000));
    }, 60000);

    it("only returns results from the specified run's namespace", async () => {
        const resultsFromA = await semanticSearch("ancient Rome empire", runIdA, 5);
        const resultsFromB = await semanticSearch("ancient Rome empire", runIdB, 5);

        expect(resultsFromA.length).toBeGreaterThan(0);
        expect(resultsFromA[0].text.toLowerCase()).toContain("rome");

        // Namespace isolation means run B's results can ONLY come from run B's
        // own content, never run A's Rome content — regardless
        // of how irrelevant those results are to the query.
        resultsFromB.forEach((result) => {
            expect(result.text.toLowerCase()).not.toContain("rome");
        });
    });
});