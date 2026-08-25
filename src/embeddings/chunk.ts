import { getEncoding } from "js-tiktoken";
import { createLogger } from "../utils/logger";

const log = createLogger({ agent: "EmbeddingAgent" });
const encoder = getEncoding("cl100k_base"); // standard tokenizer, close enough across most modern models

export interface Chunk {
  text: string;
  index: number;
  tokenCount: number;
}

export function chunkText(
  text: string,
  maxTokens = 500,
  overlapTokens = 50
): Chunk[] {
  const rawParagraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  // Pre-process: if any single paragraph exceeds maxTokens on its own,
  // split it into sentence-level pieces first, so no single unit is
  // guaranteed to blow the limit regardless of chunk packing logic below.
  const paragraphs: string[] = [];
  for (const paragraph of rawParagraphs) {
    const tokenCount = encoder.encode(paragraph).length;
    if (tokenCount <= maxTokens) {
      paragraphs.push(paragraph);
      continue;
    }

    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    let buffer = "";
    for (const sentence of sentences) {
      const candidate = buffer ? `${buffer} ${sentence}` : sentence;
      if (encoder.encode(candidate).length > maxTokens && buffer) {
        paragraphs.push(buffer);
        buffer = sentence;
      } else {
        buffer = candidate;
      }
    }
    if (buffer) paragraphs.push(buffer);
  }

  const chunks: Chunk[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = encoder.encode(paragraph).length;

    if (currentTokens + paragraphTokens > maxTokens && currentChunk.length > 0) {
      const chunkTextValue = currentChunk.join("\n\n");
      chunks.push({ text: chunkTextValue, index: chunks.length, tokenCount: currentTokens });

      const overlapText = currentChunk[currentChunk.length - 1];
      const overlapTokenCount = encoder.encode(overlapText).length;
      currentChunk = overlapTokenCount <= overlapTokens ? [overlapText] : [];
      currentTokens = currentChunk.length > 0 ? overlapTokenCount : 0;
    }

    currentChunk.push(paragraph);
    currentTokens += paragraphTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.join("\n\n"),
      index: chunks.length,
      tokenCount: currentTokens,
    });
  }

  log.info(
    { totalChunks: chunks.length, totalTokens: chunks.reduce((s, c) => s + c.tokenCount, 0) },
    "Chunked text"
  );

  return chunks;
}