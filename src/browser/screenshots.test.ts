import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import { withBrowserPage } from "./controller";

describe("screenshots", () => {
  it("captures a screenshot and saves it to disk", async () => {
    const filepath = await withBrowserPage(async (page, controller) => {
      await controller.goto(page, "https://example.com");
      return controller.screenshot(page, "test-example.png");
    });

    const stat = await fs.stat(filepath);
    expect(stat.size).toBeGreaterThan(0);
  }, 40000);

  it("automatically captures a screenshot when an action fails", async () => {
    await withBrowserPage(async (page, controller) => {
      await controller.goto(page, "https://example.com");

      await expect(
        controller.withErrorScreenshot(page, "click-missing-element", async () => {
          await controller.click(page, "#this-selector-does-not-exist");
        })
      ).rejects.toThrow();
    });

    const files = await fs.readdir("tmp/screenshots");
    const errorScreenshot = files.find((f) => f.startsWith("error-click-missing-element"));
    expect(errorScreenshot).toBeDefined();
  }, 40000);
});