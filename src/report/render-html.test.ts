import { describe, it, expect } from "vitest";
import { renderReportHtml } from "./render-html";
import type { GeneratedReport } from "./write-report";

describe("renderReportHtml", () => {
  it("converts markdown headings and citations into real HTML", async () => {
    const report: GeneratedReport = {
      markdown: `# Llamas\n\nLlamas are pack animals [Source 1].`,
      sources: [{ url: "https://example.com/llamas", title: "Llama Facts" }],
    };

    const html = await renderReportHtml(report);

    expect(html).toContain("<h1>Llamas</h1>");
    expect(html).toContain(`<a href="https://example.com/llamas">[Source 1]</a>`);
  });

  it("leaves an invalid citation number as plain text instead of crashing", async () => {
    const report: GeneratedReport = {
      markdown: `Some claim [Source 5].`,
      sources: [{ url: "https://example.com/only-one", title: "Only Source" }],
    };

    const html = await renderReportHtml(report);

    expect(html).toContain("[Source 5]");
    expect(html).not.toContain("<a href");
  });
});