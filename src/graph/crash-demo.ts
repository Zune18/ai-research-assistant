import { StateGraph, Annotation } from "@langchain/langgraph";
import { checkpointer } from "./checkpointer";

const CrashDemoState = Annotation.Root({
  count: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  log: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  shouldCrash: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
});

async function stepOne(state: typeof CrashDemoState.State) {
  return { count: state.count + 1, log: ["stepOne ran"] };
}

async function stepTwo(state: typeof CrashDemoState.State) {
  if (state.shouldCrash) {
    // Simulates a process crash mid-execution
    // happening after stepOne's checkpoint
    // was already saved, but before stepTwo's completes.
    throw new Error("Simulated crash inside stepTwo");
  }
  return { count: state.count + 1, log: ["stepTwo ran"] };
}

async function stepThree(state: typeof CrashDemoState.State) {
  return { count: state.count + 1, log: ["stepThree ran"] };
}

export function buildCrashDemoGraph() {
  return new StateGraph(CrashDemoState)
    .addNode("stepOne", stepOne)
    .addNode("stepTwo", stepTwo)
    .addNode("stepThree", stepThree)
    .addEdge("__start__", "stepOne")
    .addEdge("stepOne", "stepTwo")
    .addEdge("stepTwo", "stepThree")
    .addEdge("stepThree", "__end__")
    .compile({ checkpointer });
}