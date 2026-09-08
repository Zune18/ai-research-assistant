import { StateGraph, Annotation } from "@langchain/langgraph";
import { checkpointer } from "./checkpointer";
import { buildResearchPipelineSubgraph, ResearchPipelineState } from "./research-pipeline";
import { createLogger } from "../utils/logger";

const log = createLogger({ component: "Supervisor" });

/**
 * The only information that crosses from the subgraph back into the
 * supervisor state. Everything else inside the subgraph (HTML, scraped
 * markdown, raw chunks) stays private and is never exposed here.
 */
interface SharedResult {
  url: string;
  chunkCount: number;
  hasContext: boolean;
}

const SupervisorState = Annotation.Root({
  urlsToProcess: Annotation<string[]>({ reducer: (_, next) => next, default: () => [] }),
  currentIndex: Annotation<number>({ reducer: (_, next) => next, default: () => 0 }),
  runId: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  researchQuery: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  summaries: Annotation<string[]>({ reducer: (prev, next) => [...prev, ...next], default: () => [] }),
});

const subgraph = buildResearchPipelineSubgraph();

function toSharedResult(url: string, subgraphResult: typeof ResearchPipelineState.State): SharedResult {
  return {
    url,
    chunkCount: subgraphResult.retrievedChunks?.length ?? 0,
    hasContext: subgraphResult.retrievedContext !== null,
  };
}

// Runs the subgraph for the current URL, then moves the index forward.
async function processCurrentUrl(state: typeof SupervisorState.State) {
  const url = state.urlsToProcess[state.currentIndex];
  log.info({ url, index: state.currentIndex }, "Supervisor processing URL");

  const result = await subgraph.invoke({
    targetUrl: url,
    runId: state.runId,
    query: state.researchQuery,
  } satisfies Partial<typeof ResearchPipelineState.State>);

  const shared = toSharedResult(url, result);
  const summary = shared.hasContext
    ? `Processed ${shared.url}: ${shared.chunkCount} relevant chunk(s).`
    : `Processed ${shared.url}: no context retrieved.`;

  return {
    summaries: [summary],
    currentIndex: state.currentIndex + 1,
  };
}

/**
 * Routing function - looks at state and decides what happens next.
 * (decision-making step)
 */
function routeNext(state: typeof SupervisorState.State): "processCurrentUrl" | "__end__" {
  if (state.currentIndex < state.urlsToProcess.length) {
    return "processCurrentUrl";
  }
  return "__end__";
}

export function buildSupervisorGraph() {
  return new StateGraph(SupervisorState)
    .addNode("processCurrentUrl", processCurrentUrl)
    .addConditionalEdges("__start__", routeNext)
    .addConditionalEdges("processCurrentUrl", routeNext)
    .compile({ checkpointer });
}