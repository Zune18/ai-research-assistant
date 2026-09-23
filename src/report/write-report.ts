import { chatText } from "../llm/openrouter";
import { createLogger } from "../utils/logger";
import type { BuiltContext } from "../retrieval/build-context";

const log = createLogger({ agent: "ReportAgent" });

export interface GeneratedReport {
  markdown: string;
  sources: Array<{ url: string; title: string }>;
}

/**
 * Writes a report answering the research question, using only the given
 * context, and citing sources using the [Source N] labels from buildContext().
 */
export async function writeReport(
  researchQuery: string,
  context: BuiltContext
): Promise<GeneratedReport> {
  log.info({ researchQuery, sourceCount: context.sources.length }, "Writing report");

  const prompt = `Write a clear, well-organized report answering this question, using only the information in the sources below. Do not add information that is not in the sources.

Question: "${researchQuery}"

Sources:
${context.contextText}

Rules:
- Every factual claim must be followed by a citation like [Source 1], matching the source it came from.
- Use markdown formatting: a title, short sections with headings, and normal paragraphs.
- Do not invent facts, numbers, or sources that are not in the text above.
- If the sources only partly answer the question, say so plainly instead of guessing.

Write the report now.`;

  const markdown = await chatText(prompt);

  log.info({ researchQuery, length: markdown.length }, "Report written");

  return { markdown, sources: context.sources };
}