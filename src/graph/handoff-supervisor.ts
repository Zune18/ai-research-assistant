import { StateGraph, Annotation } from "@langchain/langgraph";
import { checkpointer } from "./checkpointer";
import { buildResearchPipelineSubgraph, ResearchPipelineState } from "./research-pipeline";
import { reflect } from "../reflection/reflect";
import { writeReport, GeneratedReport } from "../report/write-report";
import { renderReportHtml } from "../report/render-html";
import { renderReportPdf } from "../report/render-pdf";
import { createLogger } from "../utils/logger";

const log = createLogger({ component: "HandoffSupervisor" });

const MAX_ITERATIONS = 5;

const HandoffState = Annotation.Root({
  candidateUrls: Annotation<string[]>({ reducer: (_, next) => next, default: () => [] }),
  runId: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  researchQuery: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  iterationCount: Annotation<number>({ reducer: (_, next) => next, default: () => 0 }),
  summaries: Annotation<string[]>({ reducer: (prev, next) => [...prev, ...next], default: () => [] }),
  latestContext: Annotation<{ contextText: string; sources: Array<{ url: string; title: string }> } | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  isEnough: Annotation<boolean>({ reducer: (_, next) => next, default: () => false }),
  report: Annotation<GeneratedReport | null>({ reducer: (_, next) => next, default: () => null }),
  reportHtmlPath: Annotation<string | null>({ reducer: (_, next) => next, default: () => null }),
  reportPdfPath: Annotation<string | null>({ reducer: (_, next) => next, default: () => null }),
});

const subgraph = buildResearchPipelineSubgraph();

// Hands off to the next agent in line
async function processNextCandidate(state: typeof HandoffState.State) {
  const url = state.candidateUrls[state.iterationCount];
  log.info({ url, iteration: state.iterationCount }, "Handing off to research subgraph");

  const result = await subgraph.invoke({
    targetUrl: url,
    runId: state.runId,
    query: state.researchQuery,
  } satisfies Partial<typeof ResearchPipelineState.State>);

  const chunkCount = result.retrievedChunks?.length ?? 0;
  const summary = `Iteration ${state.iterationCount + 1}: ${url} -> ${chunkCount} chunk(s).`;

  return {
    summaries: [summary],
    latestContext: result.retrievedContext,
    iterationCount: state.iterationCount + 1,
  };
}

async function reflectOnProgress(state: typeof HandoffState.State) {
  if (!state.latestContext) {
    return { isEnough: false };
  }
  const result = await reflect(state.researchQuery, state.latestContext);
  log.info({ isEnough: result.isEnough, gaps: result.gaps }, "Reflection result");
  return { isEnough: result.isEnough };
}

/**
 * Writes the final report, then renders it as both HTML and PDF files.
 * Runs once, right before the graph ends.
 */
async function writeFinalReport(state: typeof HandoffState.State) {
  if (!state.latestContext) {
    log.warn("No context gathered — skipping report generation");
    return { report: null };
  }

  const report = await writeReport(state.researchQuery, state.latestContext);
  const html = await renderReportHtml(report);

  const safeFilename = `report-${Date.now()}`;
  const htmlPath = `tmp/reports/${safeFilename}.html`;
  const fs = await import("node:fs/promises");
  await fs.mkdir("tmp/reports", { recursive: true });
  await fs.writeFile(htmlPath, html);

  const pdfPath = await renderReportPdf(html, `${safeFilename}.pdf`);

  return { report, reportHtmlPath: htmlPath, reportPdfPath: pdfPath };
}

function planNextStep(
  state: typeof HandoffState.State
): "processNextCandidate" | "reflectOnProgress" | "writeFinalReport" {
  if (state.iterationCount >= MAX_ITERATIONS || state.iterationCount >= state.candidateUrls.length) {
    return "writeFinalReport";
  }
  if (state.latestContext === null) {
    return "processNextCandidate";
  }
  return "reflectOnProgress";
}

function routeAfterReflection(
  state: typeof HandoffState.State
): "processNextCandidate" | "writeFinalReport" {
  if (state.isEnough) {
    log.info("Reflection says we have enough, moving to report");
    return "writeFinalReport";
  }
  if (state.iterationCount >= MAX_ITERATIONS || state.iterationCount >= state.candidateUrls.length) {
    return "writeFinalReport";
  }
  return "processNextCandidate";
}

export function buildHandoffSupervisorGraph() {
  return new StateGraph(HandoffState)
    .addNode("processNextCandidate", processNextCandidate)
    .addNode("reflectOnProgress", reflectOnProgress)
    .addNode("writeFinalReport", writeFinalReport)
    .addConditionalEdges("__start__", planNextStep)
    .addConditionalEdges("processNextCandidate", planNextStep)
    .addConditionalEdges("reflectOnProgress", routeAfterReflection)
    .addEdge("writeFinalReport", "__end__")
    .compile({ checkpointer });
}