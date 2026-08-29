import { StateGraph, Annotation } from "@langchain/langgraph";
import { checkpointer } from "./checkpointer";
import { withBrowserPage } from "../browser/controller";
import { htmlToMarkdown, ScrapedContent } from "../scraper/html-to-markdown";
import { chunkText } from "../embeddings/chunk";
import { embedChunks } from "../embeddings/embed-chunks";
import { upsertChunks } from "../embeddings/upsert";
import { semanticSearch } from "../retrieval/search";
import { rerankChunks, RerankedChunk } from "../reranker/rerank-chunks";
import { buildContext, BuiltContext } from "../retrieval/build-context";
import { createLogger } from "../utils/logger";
import type { BrowserAgentResult } from "../types";

const browserLog = createLogger({ agent: "BrowserAgent" });
const scraperLog = createLogger({ agent: "ScraperAgent" });
const embeddingLog = createLogger({ agent: "EmbeddingAgent" });
const retrievalLog = createLogger({ agent: "RetrievalAgent" });
const rerankerLog = createLogger({ agent: "RerankerAgent" });

const ResearchPipelineState = Annotation.Root({
  targetUrl: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  runId: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  query: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  browserResult: Annotation<BrowserAgentResult | null>({ reducer: (_, next) => next, default: () => null }),
  scrapedContent: Annotation<ScrapedContent | null>({ reducer: (_, next) => next, default: () => null }),
  chunksUpserted: Annotation<number>({ reducer: (_, next) => next, default: () => 0 }),
  retrievedChunks: Annotation<RerankedChunk[] | null>({ reducer: (_, next) => next, default: () => null }),
  retrievedContext: Annotation<BuiltContext | null>({ reducer: (_, next) => next, default: () => null }),
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
  if (!state.browserResult) throw new Error("Scraper node reached with no browser result");
  scraperLog.info({ url: state.browserResult.url }, "Extracting content");
  const scrapedContent = htmlToMarkdown(state.browserResult.html, state.browserResult.url);
  return { scrapedContent };
}

async function embeddingNode(state: typeof ResearchPipelineState.State) {
  if (!state.scrapedContent) throw new Error("Embedding node reached with no scraped content");
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

async function retrievalNode(state: typeof ResearchPipelineState.State) {
  if (!state.query) throw new Error("Retrieval node reached with no query");
  retrievalLog.info({ query: state.query, runId: state.runId }, "Retrieving candidate chunks");

  const candidates = await semanticSearch(state.query, state.runId, 20);
  const retrievedChunks = await rerankChunks(state.query, candidates, 5);

  return { retrievedChunks };
}

async function contextNode(state: typeof ResearchPipelineState.State) {
  if (!state.retrievedChunks) throw new Error("Context node reached with no reranked chunks");
  rerankerLog.info({ count: state.retrievedChunks.length }, "Building final context from reranked chunks");
  const retrievedContext = buildContext(state.retrievedChunks);
  return { retrievedContext };
}

export function buildResearchPipelineGraph() {
  return new StateGraph(ResearchPipelineState)
    .addNode("browserNode", browserNode)
    .addNode("scraperNode", scraperNode)
    .addNode("embeddingNode", embeddingNode)
    .addNode("retrievalNode", retrievalNode)
    .addNode("contextNode", contextNode)
    .addEdge("__start__", "browserNode")
    .addEdge("browserNode", "scraperNode")
    .addEdge("scraperNode", "embeddingNode")
    .addEdge("embeddingNode", "retrievalNode")
    .addEdge("retrievalNode", "contextNode")
    .addEdge("contextNode", "__end__")
    .compile({ checkpointer });
}