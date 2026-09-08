import { StateGraph, Annotation } from "@langchain/langgraph";
import { checkpointer } from "./checkpointer";
import { buildResearchPipelineSubgraph, ResearchPipelineState } from "./research-pipeline";
import { createLogger } from "../utils/logger";

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
});

const subgraph = buildResearchPipelineSubgraph();

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

export function buildHandoffSupervisorGraph() {
  return new StateGraph(HandoffState)
    .addNode("processNextCandidate", processNextCandidate)
    .addConditionalEdges("__start__", planNextStep)
    .addConditionalEdges("processNextCandidate", planNextStep)
    .compile({ checkpointer });
}