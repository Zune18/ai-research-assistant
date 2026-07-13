import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "../../config/env";

export const pinecone = new Pinecone({ apiKey: env.PINECONE_API_KEY });

const EMBEDDING_DIMENSION = 1536;

// Ensures the index exists, creating it only if missing.
export async function ensureIndexExists(): Promise<void> {
  const existing = await pinecone.listIndexes();
  const alreadyExists = existing.indexes?.some(
    (idx) => idx.name === env.PINECONE_INDEX_NAME
  );

  if (alreadyExists) {
    return;
  }

  await pinecone.createIndex({
    name: env.PINECONE_INDEX_NAME,
    dimension: EMBEDDING_DIMENSION,
    metric: "cosine",
    spec: {
      serverless: {
        cloud: "aws",
        region: "us-east-1",
      },
    },
    waitUntilReady: true,
  });
}

export function getIndex() {
  return pinecone.index(env.PINECONE_INDEX_NAME);
}