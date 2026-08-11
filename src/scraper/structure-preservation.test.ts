import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "./html-to-markdown";

const HTML_WITH_TABLE_AND_CODE = `
<html>
  <head><title>Technical Doc</title></head>
  <body>
    <article>
      <h1>API Comparison</h1>
      <p>This document compares two APIs across several dimensions, with enough surrounding text for Readability to treat it as genuine article content rather than boilerplate.</p>
      <table>
        <thead>
          <tr><th>Feature</th><th>REST</th><th>GraphQL</th></tr>
        </thead>
        <tbody>
          <tr><td>Overfetching</td><td>Common</td><td>Rare</td></tr>
          <tr><td>Caching</td><td>Easy</td><td>Harder</td></tr>
        </tbody>
      </table>
      <p>Here is an example request:</p>
      <pre><code>fetch("/api/users").then(res =&gt; res.json());</code></pre>
    </article>
  </body>
</html>
`;

describe("structure preservation: tables and code blocks", () => {
  it("converts an HTML table to markdown table syntax", () => {
    const result = htmlToMarkdown(HTML_WITH_TABLE_AND_CODE, "https://example.com/doc");

    expect(result.markdown).toContain("| Feature");
    expect(result.markdown).toContain("REST");
    expect(result.markdown).toContain("GraphQL");
    expect(result.markdown).toContain("Overfetching");
    // GFM table syntax uses a separator row of dashes
    expect(result.markdown).toMatch(/\|\s*-+\s*\|/);
  });

  it("preserves code blocks as fenced markdown code", () => {
    const result = htmlToMarkdown(HTML_WITH_TABLE_AND_CODE, "https://example.com/doc");

    expect(result.markdown).toContain("```");
    expect(result.markdown).toContain('fetch("/api/users")');
  });
});