import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "./html-to-markdown";

const HTML_WITH_METADATA = `
<html>
  <head>
    <title>Deep Dive: Testing Strategies</title>
    <meta name="author" content="Jane Smith" />
    <meta property="article:published_time" content="2026-03-15T00:00:00Z" />
    <link rel="canonical" href="https://example.com/canonical-path" />
  </head>
  <body>
    <article>
      <h1>Deep Dive: Testing Strategies</h1>
      <p>This is a sufficiently long paragraph of real article content so that Readability confidently extracts it as the main body rather than rejecting the page as non-article content.</p>
      <p>A second paragraph adds enough additional text to make the extraction reliable and realistic for testing metadata alongside content.</p>
    </article>
  </body>
</html>
`;

describe("metadata extraction", () => {
  it("extracts author, publish date, and canonical URL from meta tags", () => {
    const result = htmlToMarkdown(HTML_WITH_METADATA, "https://example.com/original-path");

    expect(result.author).toBe("Jane Smith");
    expect(result.publishedAt).toBe("2026-03-15T00:00:00Z");
    expect(result.canonicalUrl).toBe("https://example.com/canonical-path");
  });

  it("falls back to the fetched URL when no canonical link is present", () => {
    const htmlWithoutCanonical = HTML_WITH_METADATA.replace(
      /<link rel="canonical".*?\/>/,
      ""
    );
    const result = htmlToMarkdown(htmlWithoutCanonical, "https://example.com/fallback-path");

    expect(result.canonicalUrl).toBe("https://example.com/fallback-path");
  });

  it("returns null for author/publishedAt when no metadata is present at all", () => {
    const bareHtml = `
      <html><head><title>No Metadata</title></head>
      <body><article><h1>No Metadata</h1><p>Just enough content here for Readability to extract something meaningful without any accompanying author or date metadata present anywhere in the document.</p></article></body></html>
    `;
    const result = htmlToMarkdown(bareHtml, "https://example.com/bare");

    expect(result.author).toBeNull();
    expect(result.publishedAt).toBeNull();
  });
});