import { StateGraph, Annotation } from "@langchain/langgraph";
import { checkpointer } from "./checkpointer";

const HumanInputState = Annotation.Root({
  plan: Annotation<string[]>({ reducer: (_, next) => next, default: () => [] }),
  executed: Annotation<string[]>({ reducer: (_, next) => next, default: () => [] }),
});

async function makePlan() {
  return {
    plan: ["https://good-one.com", "https://good-two.com", "https://bad-one.com"],
  };
}

async function executePlan(state: typeof HumanInputState.State) {
  return { executed: state.plan };
}

export function buildHumanInputDemoGraph() {
  return new StateGraph(HumanInputState)
    .addNode("makePlan", makePlan)
    .addNode("executePlan", executePlan)
    .addEdge("__start__", "makePlan")
    .addEdge("makePlan", "executePlan")
    .addEdge("executePlan", "__end__")
    .compile({
      checkpointer,
      interruptBefore: ["executePlan"],
    });
}