import { StateGraph, Annotation } from "@langchain/langgraph";
import { checkpointer } from "./checkpointer";
import { withBrowserPage } from "../browser/controller";
import { htmlToMarkdown, ScrapedContent } from "../scraper/html-to-markdown";
import { chunkText } from "../embeddings/chunk";
import { embedChunks } from "../embeddings/embed-chunks";
import { upsertChunks } from "../embeddings/upsert";
import { createLogger } from "../utils/logger";
import type { BrowserAgentResult } from "../types";

const browserLog = createLogger({ agent: "BrowserAgent" });
const scraperLog = createLogger({ agent: "ScraperAgent" });
const embeddingLog = createLogger({ agent: "EmbeddingAgent" });

const ResearchPipelineState = Annotation.Root({
  targetUrl: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  runId: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  browserResult: Annotation<BrowserAgentResult | null>({ reducer: (_, next) => next, default: () => null }),
  scrapedContent: Annotation<ScrapedContent | null>({ reducer: (_, next) => next, default: () => null }),
  chunksUpserted: Annotation<number>({ reducer: (_, next) => next, default: () => 0 }),
});

async function browserNode(state: typeof ResearchPipelineState.State) {
  browserLog.info({ url: state.targetUrl }, "Visiting page");
  const browserResult = await withBrowserPage(async (page, controller) => {
    await controller.goto(page, state.targetUrl);
    await controller.waitForSelector(page, "body");
    const title = await page.title();
    const html = await page.content();
    return { url: state.targetUrl, title, html };
  });
  return { browserResult };
}

async function scraperNode(state: typeof ResearchPipelineState.State) {
  if (!state.browserResult) {
    throw new Error("Scraper node reached with no browser result — pipeline ordering bug");
  }
  scraperLog.info({ url: state.browserResult.url }, "Extracting content");
  const scrapedContent = htmlToMarkdown(state.browserResult.html, state.browserResult.url);
  return { scrapedContent };
}

async function embeddingNode(state: typeof ResearchPipelineState.State) {
  if (!state.scrapedContent) {
    throw new Error("Embedding node reached with no scraped content — pipeline ordering bug");
  }
  embeddingLog.info({ url: state.browserResult!.url }, "Chunking and embedding content");

  const chunks = chunkText(state.scrapedContent.markdown);
  const embedded = await embedChunks(chunks);
  const chunksUpserted = await upsertChunks(embedded, {
    url: state.browserResult!.url,
    runId: state.runId,
    title: state.scrapedContent.title,
  });

  return { chunksUpserted };
}

export function buildResearchPipelineGraph() {
  return new StateGraph(ResearchPipelineState)
    .addNode("browserNode", browserNode)
    .addNode("scraperNode", scraperNode)
    .addNode("embeddingNode", embeddingNode)
    .addEdge("__start__", "browserNode")
    .addEdge("browserNode", "scraperNode")
    .addEdge("scraperNode", "embeddingNode")
    .addEdge("embeddingNode", "__end__")
    .compile({ checkpointer });
}