import { marked } from "marked";
import type { GeneratedReport } from "./write-report";
import { createLogger } from "../utils/logger";

const log = createLogger({ agent: "ReportAgent" });


// Converts [Source N] citation markers in the markdown into real HTML links
function replaceCitationsWithLinks(
  markdown: string,
  sources: Array<{ url: string; title: string }>
): string {
  return markdown.replace(/\[Source (\d+)\]/g, (match, numberStr) => {
    const index = Number(numberStr) - 1; // sources are 1-indexed in the text
    const source = sources[index];

    if (!source) {
      // A citation number the model invented that doesn't match a real source —
      // leave it as plain text rather than crashing or silently hiding the issue.
      log.warn({ citation: match }, "Citation number does not match any known source");
      return match;
    }

    return `[${match}](${source.url})`;
  });
}

// Renders a generated report as a full HTML string, with citation markers turned into real links.
export async function renderReportHtml(report: GeneratedReport): Promise<string> {
  const markdownWithLinks = replaceCitationsWithLinks(report.markdown, report.sources);
  const bodyHtml = await marked.parse(markdownWithLinks);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Research Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; line-height: 1.6; padding: 0 20px; }
    h1, h2, h3 { line-height: 1.3; }
    a { color: #2563eb; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  log.info({ length: html.length }, "Rendered report as HTML");

  return html;
}