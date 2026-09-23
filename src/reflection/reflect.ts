import { chatJSON } from "../llm/openrouter";
import { createLogger } from "../utils/logger";
import type { BuiltContext } from "../retrieval/build-context";

const log = createLogger({ agent: "ReflectionAgent" });

export interface ReflectionResult {
  isEnough: boolean;
  gaps: string[];
  suggestedNextQuery: string | null;
  reasoning: string;
}

const reflectionSchema = {
  type: "object",
  properties: {
    isEnough: { type: "boolean" },
    gaps: { type: "array", items: { type: "string" } },
    suggestedNextQuery: { type: ["string", "null"] },
    reasoning: { type: "string" },
  },
  required: ["isEnough", "gaps", "suggestedNextQuery", "reasoning"],
};

/**
 * Looks at the research question and whats been found so far, and judges
 * whether its enough to answer the question well. If not, it names whats
 * missing and suggests a follow up search query.
 */
export async function reflect(
  researchQuery: string,
  context: BuiltContext
): Promise<ReflectionResult> {
  log.info({ researchQuery, sourceCount: context.sources.length }, "Reflecting on research so far");

  const prompt = `You are judging whether the available research is sufficient to answer a user's question.

Research question: "${researchQuery}"

Sources found so far (${context.sources.length}):
${context.contextText}

Determine whether the existing research is sufficient to answer the question directly and accurately.

Set isEnough=true when:
- The context directly addresses the user's question.
- It contains the main facts or explanations needed to answer it.
- A reasonable answer can be written without additional research.

Do NOT require:
- Every possible detail or nuance.
- Multiple sources when one source directly answers the question.
- Additional examples, statistics, historical background, or related topics that the user did not ask for.
- Information merely because it could make the answer more comprehensive.

Set isEnough=false only when important information needed to answer the actual question is missing.

If isEnough=true:
- gaps must be []
- suggestedNextQuery must be null
- reasoning should briefly explain why the context is sufficient.

If isEnough=false:
- List only the important missing information in gaps.
- suggestedNextQuery should be one focused search query targeting the biggest gap.

Return only the requested JSON structure.`;

  const result = await chatJSON<{
    isEnough: boolean;
    gaps: string[];
    suggestedNextQuery: string | null;
    reasoning: string;
  }>(prompt, reflectionSchema);

  log.info(
    { isEnough: result.isEnough, gapCount: result.gaps.length },
    "Reflection complete"
  );

  return result;
}