import type { RetrievedChunk } from "./search";

export interface BuiltContext {
  contextText: string;
  sources: Array<{ url: string; title: string }>;
}

/**
 * Formats retrieved chunks into a single LLM-ready context block, with
 * clear per-source delimiters and a numbered source reference the LLM
 * can cite back to (e.g. "[Source 2]") — reducing the chance an LLM
 * mixes information between sources.
 */
export function buildContext(chunks: RetrievedChunk[]): BuiltContext {
  // De-duplicate sources while keeping first-seen order, since multiple
  // chunks often come from the same URL
  const seenUrls = new Map<string, number>(); // url -> source number
  const sources: Array<{ url: string; title: string }> = [];

  for (const chunk of chunks) {
    if (!seenUrls.has(chunk.url)) {
      seenUrls.set(chunk.url, sources.length + 1);
      sources.push({ url: chunk.url, title: chunk.title });
    }
  }

  const contextText = chunks
    .map((chunk) => {
      const sourceNumber = seenUrls.get(chunk.url);
      return `[Source ${sourceNumber}: ${chunk.title || chunk.url}]\n${chunk.text}`;
    })
    .join("\n\n---\n\n");

  return { contextText, sources };
}