import { StateGraph, Annotation } from "@langchain/langgraph";
import { checkpointer } from "./checkpointer";
import { withBrowserPage } from "../browser/controller";
import { createLogger } from "../utils/logger";
import type { BrowserAgentResult } from "../types";

const log = createLogger({ agent: "BrowserAgent" });

const BrowserAgentState = Annotation.Root({
  targetUrl: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  result: Annotation<BrowserAgentResult | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
});

/**
 * Browser Agent node — visits targetUrl, captures the page title
 * and a screenshot, returns the result via BrowserAgentResult.
 */
async function browserNode(state: typeof BrowserAgentState.State) {
  log.info({ url: state.targetUrl }, "Browser Agent visiting page");

  const result = await withBrowserPage(async (page, controller) => {
    await controller.goto(page, state.targetUrl);
    await controller.waitForSelector(page, "body");

    const title = await page.title();
    const html = await page.content();
    const screenshotPath = await controller.screenshot(
      page,
      `browser-node-${Date.now()}.png`
    );

    return { url: state.targetUrl, title, screenshotPath, html };
  });

  return { result };
}

export function buildBrowserGraph() {
  return new StateGraph(BrowserAgentState)
    .addNode("browserNode", browserNode)
    .addEdge("__start__", "browserNode")
    .addEdge("browserNode", "__end__")
    .compile({ checkpointer });
}