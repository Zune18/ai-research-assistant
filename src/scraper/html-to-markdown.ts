import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { createLogger } from "../utils/logger";

const log = createLogger({ agent: "ScraperAgent" });

const turndownService = new TurndownService({
  // Convert headings to Markdown using #, ##, ###, etc.
  // Example: <h1>Hello</h1> -> # Hello
  headingStyle: "atx",

  // Convert multi-line code blocks using triple backticks.
  // Example: <pre><code>...</code></pre> -> ```...```
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});
turndownService.use(gfm); // adds table, strikethrough, task list support

export interface ScrapedContent {
  title: string;
  markdown: string;
  excerpt: string;
}

/**
 * Extracts the main article content from raw HTML and converts it to clean
 * markdown, stripping navigation/ads/boilerplate.
 */
export function htmlToMarkdown(rawHtml: string, url: string): ScrapedContent {
  const dom = new JSDOM(rawHtml, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.content) {
    log.warn({ url }, "Readability could not extract article content");
    throw new Error(`Failed to extract readable content from ${url}`);
  }

  const markdown = turndownService.turndown(article.content);

  log.info({ url, title: article.title, length: markdown.length }, "Converted HTML to markdown");

  return {
    title: article.title ?? "",
    markdown,
    excerpt: article.excerpt ?? "",
  };
}