import { chatJSON } from "../llm/openrouter";
import { createLogger } from "../utils/logger";
import type { RerankedChunk } from "../reranker/rerank-chunks";

const log = createLogger({ agent: "VerificationAgent" });

export interface VerificationResult {
  claim: string;
  isSupported: boolean;
  confidence: number; // 0 to 1
  supportingSourceUrl: string | null;
  reasoning: string;
}

const verificationSchema = {
  type: "object",
  properties: {
    isSupported: { type: "boolean" },
    confidence: { type: "number" },
    supportingSourceUrl: { type: ["string", "null"] },
    reasoning: { type: "string" },
  },
  required: ["isSupported", "confidence", "supportingSourceUrl", "reasoning"],
};

/**
 * Checks whether a claim is actually backed by the given sources.
 * Sends the claim and the source text to the LLM and asks it to judge.
 */
export async function verifyClaim(
  claim: string,
  sources: RerankedChunk[]
): Promise<VerificationResult> {
  log.info({ claim, sourceCount: sources.length }, "Verifying claim against sources");

  const sourcesText = sources
    .map((s, i) => `[Source ${i + 1}: ${s.url}]\n${s.text}`)
    .join("\n\n---\n\n");

  const prompt = `You are checking if a claim is actually supported by the given sources.

Claim: "${claim}"

Sources:
${sourcesText}

Decide if the claim is directly supported by at least one source. Do not assume something is true just because it sounds reasonable — only mark it supported if a source actually says it.`;

  const result = await chatJSON<{
    isSupported: boolean;
    confidence: number;
    supportingSourceUrl: string | null;
    reasoning: string;
  }>(prompt, verificationSchema);

  log.info(
    { claim, isSupported: result.isSupported, confidence: result.confidence },
    "Verification complete"
  );

  return {
    claim,
    isSupported: result.isSupported,
    confidence: result.confidence,
    supportingSourceUrl: result.supportingSourceUrl,
    reasoning: result.reasoning,
  };
}