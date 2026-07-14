import { StateGraph, Annotation, MemorySaver } from "@langchain/langgraph";

const DemoState = Annotation.Root({
  count: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  log: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

async function stepOne(state: typeof DemoState.State) {
  return { count: state.count + 1, log: ["stepOne ran"] };
}

async function stepTwo(state: typeof DemoState.State) {
  return { count: state.count + 1, log: ["stepTwo ran"] };
}

export function buildDemoGraph() {
  const checkpointer = new MemorySaver();

  const graph = new StateGraph(DemoState)
    .addNode("stepOne", stepOne)
    .addNode("stepTwo", stepTwo)
    .addEdge("__start__", "stepOne")
    .addEdge("stepOne", "stepTwo")
    .addEdge("stepTwo", "__end__")
    .compile({ checkpointer });

  return graph;
}