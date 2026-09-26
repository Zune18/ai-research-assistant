import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import { renderReportPdf } from "./render-pdf";

describe("renderReportPdf", () => {
  it("creates a real, non-empty PDF file from HTML", async () => {
    const html = `<!DOCTYPE html><html><body><h1>Test Report</h1><p>Some content.</p></body></html>`;

    const filepath = await renderReportPdf(html, "test-report.pdf");

    const stat = await fs.stat(filepath);
    expect(stat.size).toBeGreaterThan(0);

    // A real PDF file starts with this exact byte signature
    const buffer = await fs.readFile(filepath);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  }, 30000);
});