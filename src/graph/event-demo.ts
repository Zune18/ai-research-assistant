import { StateGraph, Annotation } from "@langchain/langgraph";
import { checkpointer } from "./checkpointer";
import { createLogger } from "../utils/logger";

const log = createLogger({ component: "EventDemo" });

const EventDemoState = Annotation.Root({
  count: Annotation<number>({ reducer: (_, next) => next, default: () => 0 }),
  log: Annotation<string[]>({ reducer: (prev, next) => [...prev, ...next], default: () => [] }),
});

async function stepOne(state: typeof EventDemoState.State) {
  return { count: state.count + 1, log: ["stepOne ran"] };
}
async function stepTwo(state: typeof EventDemoState.State) {
  return { count: state.count + 1, log: ["stepTwo ran"] };
}
async function stepThree(state: typeof EventDemoState.State) {
  return { count: state.count + 1, log: ["stepThree ran"] };
}

function buildEventDemoGraph() {
  return new StateGraph(EventDemoState)
    .addNode("stepOne", stepOne)
    .addNode("stepTwo", stepTwo)
    .addNode("stepThree", stepThree)
    .addEdge("__start__", "stepOne")
    .addEdge("stepOne", "stepTwo")
    .addEdge("stepTwo", "stepThree")
    .addEdge("stepThree", "__end__")
    .compile({ checkpointer });
}

/**
 * Stream raw StreamEvents and filters to only "node started" / "node finished"
 * events — ignoring the internal event types
 */
export async function runWithFilteredEvents(threadId: string) {
  const graph = buildEventDemoGraph();
  const config = { configurable: { thread_id: threadId } };

  const relevant: Array<{ event: string; name: string }> = [];

  for await (const event of graph.streamEvents({}, { ...config, version: "v2" })) {
    if (event.event === "on_chain_start" || event.event === "on_chain_end") {
      // Only keep events for our actual node names — LangGraph also emits
      // start/end events for internal wrapper components we don't care about.
      if (["stepOne", "stepTwo", "stepThree"].includes(event.name)) {
        log.info({ event: event.event, name: event.name }, "Filtered event");
        relevant.push({ event: event.event, name: event.name });
      }
    }
  }

  return relevant;
}