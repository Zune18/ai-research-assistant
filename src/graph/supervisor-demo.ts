import { StateGraph, Annotation } from "@langchain/langgraph";
import { checkpointer } from "./checkpointer";
import { buildResearchPipelineSubgraph, ResearchPipelineState } from "./research-pipeline";
import { createLogger } from "../utils/logger";

const log = createLogger({ component: "SupervisorDemo" });

// Outer graph state — different shape than the subgraph,
// to prove real mapping is happening, not just passthrough.
const OuterState = Annotation.Root({
  urlToProcess: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  runId: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  researchQuery: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  finalSummary: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
});

const subgraph = buildResearchPipelineSubgraph();

/**
 * Wraps the subgraph as a node function: maps OUTER state -> INNER input,
 * invokes the subgraph, maps INNER output -> OUTER state update.
 * This mapping is required by subgraphs.
 */
async function runResearchSubgraph(state: typeof OuterState.State) {
  log.info({ url: state.urlToProcess }, "Outer graph invoking research subgraph");

  const subgraphResult = await subgraph.invoke({
    targetUrl: state.urlToProcess,
    runId: state.runId,
    query: state.researchQuery,
  } satisfies Partial<typeof ResearchPipelineState.State>);

  // Map the subgraph's internal output to a narrow —
  // shared-vs-private state boundary
  const finalSummary = subgraphResult.retrievedContext
    ? `Processed ${state.urlToProcess}: ${subgraphResult.retrievedContext.sources.length} source(s), ${subgraphResult.retrievedChunks?.length ?? 0} relevant chunk(s) found.`
    : "No context retrieved.";

  return { finalSummary };
}

export function buildSupervisorDemoGraph() {
  return new StateGraph(OuterState)
    .addNode("runResearchSubgraph", runResearchSubgraph)
    .addEdge("__start__", "runResearchSubgraph")
    .addEdge("runResearchSubgraph", "__end__")
    .compile({ checkpointer });
}