import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "./html-to-markdown";

const SAMPLE_HTML = `
<html>
  <head><title>Test Article</title></head>
  <body>
    <nav>Home | About | Contact</nav>
    <article>
      <h1>Understanding Test Articles</h1>
      <p>This is the <strong>first paragraph</strong> of a real article, long enough for Readability to confidently treat it as the main content rather than boilerplate.</p>
      <p>This is a second paragraph with a <a href="/link">relative link</a> to make sure link resolution works correctly during extraction and conversion.</p>
      <ul>
        <li>First point</li>
        <li>Second point</li>
      </ul>
    </article>
    <footer>Copyright 2026</footer>
  </body>
</html>
`;

describe("htmlToMarkdown", () => {
    it("extracts main content and converts it to markdown, stripping nav/footer", () => {
        const result = htmlToMarkdown(SAMPLE_HTML, "https://example.com/article");

        expect(result.title).toBe("Test Article");
        expect(result.markdown).toContain("# Understanding Test Articles");
        expect(result.markdown).toContain("**first paragraph**");
        expect(result.markdown).toContain("First point");
        expect(result.markdown).toContain("Second point");

        expect(result.markdown).not.toContain("Home | About | Contact");
        expect(result.markdown).not.toContain("Copyright 2026");
    });

    it("throws a clear error when content cannot be extracted", () => {
        const emptyHtml = `<html><body></body></html>`;
        expect(() => htmlToMarkdown(emptyHtml, "https://example.com")).toThrow(
            "Failed to extract readable content"
        );
    });

    it("resolves relative links to absolute URLs using the provided base url", () => {
        const result = htmlToMarkdown(SAMPLE_HTML, "https://example.com/article");
        expect(result.markdown).toContain("https://example.com/link");
    });
});