import fs from "node:fs/promises";
import path from "node:path";
import { withBrowserPage } from "../browser/controller";
import { createLogger } from "../utils/logger";

const log = createLogger({ agent: "ReportAgent" });

// Renders an HTML string to a PDF file
export async function renderReportPdf(html: string, filename: string): Promise<string> {
  const dir = path.join(process.cwd(), "tmp", "reports");
  await fs.mkdir(dir, { recursive: true });
  const filepath = path.join(dir, filename);

  await withBrowserPage(async (page) => {
    // setContent loads our HTML string directly, no URL/network request needed —
    // different from goto(), which is for real URLs.
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    await page.pdf({
      path: filepath,
      format: "A4",
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      printBackground: true,
    });
  });

  log.info({ filepath }, "Rendered report as PDF");

  return filepath;
}