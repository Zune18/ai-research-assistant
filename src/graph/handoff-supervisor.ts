import { StateGraph, Annotation } from "@langchain/langgraph";
import { checkpointer } from "./checkpointer";
import { buildResearchPipelineSubgraph, ResearchPipelineState } from "./research-pipeline";
import { createLogger } from "../utils/logger";
import { reflect } from "../reflection/reflect";

const log = createLogger({ component: "HandoffSupervisor" });

const MAX_ITERATIONS = 5;

const HandoffState = Annotation.Root({
  candidateUrls: Annotation<string[]>({ reducer: (_, next) => next, default: () => [] }),
  runId: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  researchQuery: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  minChunksNeeded: Annotation<number>({ reducer: (_, next) => next, default: () => 5 }),
  totalChunksFound: Annotation<number>({ reducer: (_, next) => next, default: () => 0 }),
  iterationCount: Annotation<number>({ reducer: (_, next) => next, default: () => 0 }),
  summaries: Annotation<string[]>({ reducer: (prev, next) => [...prev, ...next], default: () => [] }),
  latestContext: Annotation<{ contextText: string; sources: Array<{ url: string; title: string }> } | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  isEnough: Annotation<boolean>({ reducer: (_, next) => next, default: () => false }),
});

const subgraph = buildResearchPipelineSubgraph();

/**
 * Hands off to the next agent in line: takes the next unprocessed URL,
 * runs it through the full research subgraph, and adds its chunk count
 * to the running total.
 */
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
    totalChunksFound: state.totalChunksFound + chunkCount,
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
 * The Planner's decision: do we have enough chunks yet? If not, and we still
 * have candidate URLs left, and we haven't hit the hard cap — hand off to
 * another round. Otherwise, stop.
 */
function planNextStep(state: typeof HandoffState.State): "processNextCandidate" | "__end__" {
  if (state.totalChunksFound >= state.minChunksNeeded) {
    log.info({ totalChunksFound: state.totalChunksFound }, "Enough chunks found, stopping");
    return "__end__";
  }
  if (state.iterationCount >= MAX_ITERATIONS) {
    log.warn({ iterationCount: state.iterationCount }, "Hit max iterations, stopping anyway");
    return "__end__";
  }
  if (state.iterationCount >= state.candidateUrls.length) {
    log.info("No more candidate URLs left, stopping");
    return "__end__";
  }
  return "processNextCandidate";
}

function routeAfterReflection(state: typeof HandoffState.State): "processNextCandidate" | "__end__" {
  if (state.isEnough) {
    log.info("Reflection says we have enough, stopping");
    return "__end__";
  }
  if (state.iterationCount >= MAX_ITERATIONS || state.iterationCount >= state.candidateUrls.length) {
    return "__end__";
  }
  return "processNextCandidate";
}

export function buildHandoffSupervisorGraph() {
  return new StateGraph(HandoffState)
    .addNode("processNextCandidate", processNextCandidate)
    .addNode("reflectOnProgress", reflectOnProgress)
    .addConditionalEdges("__start__", planNextStep)
    .addConditionalEdges("processNextCandidate", planNextStep)
    .addConditionalEdges("reflectOnProgress", routeAfterReflection)
    .compile({ checkpointer });
}