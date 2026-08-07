import { chromium, Browser, Page } from "playwright";
import { createLogger } from "../utils/logger";
import fs from "node:fs/promises";
import path from "node:path";

const log = createLogger({ agent: "BrowserAgent" });

/**
 * Wraps a single Playwright browser lifecycle: launch once, open pages as
 * needed, guarantee the browser is closed even if something throws.
 */
export class BrowserController {
    private browser: Browser | null = null;

    async launch(): Promise<void> {
        if (this.browser) {
            return; // already launched — idempotent
        }
        log.info("Launching browser");
        this.browser = await chromium.launch({ headless: true });
    }

    async newPage(): Promise<Page> {
        if (!this.browser) {
            throw new Error("Browser not launched — call launch() first");
        }
        return this.browser.newPage();
    }

    async goto(page: Page, url: string): Promise<void> {
        log.info({ url }, "Navigating to page");
        await page.goto(url, { waitUntil: "domcontentloaded" });
    }

    async waitForSelector(page: Page, selector: string, timeoutMs = 10000): Promise<void> {
        log.info({ selector }, "Waiting for selector");
        await page.waitForSelector(selector, { timeout: timeoutMs });
    }

    async click(page: Page, selector: string): Promise<void> {
        log.info({ selector }, "Clicking element");
        await page.click(selector);
    }

    async scrollToBottom(page: Page): Promise<void> {
        log.info("Scrolling to bottom");
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }

    async close(): Promise<void> {
        if (this.browser) {
            log.info("Closing browser");
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Repeatedly clicks a "next page" selector and calls onPage after each
     * navigation, until the selector no longer exists (no more pages) or
     * maxPages is reached
     */
    async paginateByClicking(
        page: Page,
        nextSelector: string,
        onPage: (page: Page, pageNumber: number) => Promise<void>,
        maxPages = 10
    ): Promise<number> {
        let pageNumber = 1;
        await onPage(page, pageNumber);

        while (pageNumber < maxPages) {
            const nextExists = await page.$(nextSelector);
            if (!nextExists) {
                log.info({ pageNumber }, "No more pages found, stopping pagination");
                break;
            }

            log.info({ pageNumber: pageNumber + 1 }, "Navigating to next page");
            await this.click(page, nextSelector);
            await page.waitForLoadState("domcontentloaded");

            pageNumber++;
            await onPage(page, pageNumber);
        }

        if (pageNumber === maxPages) {
            log.warn({ maxPages }, "Reached max page limit, stopping pagination");
        }

        return pageNumber;
    }

    /**
     * Repeatedly scrolls to the bottom of the page, waiting for new content to
     * load each time, until content stops growing (no new items appeared) or
     * maxScrolls is reached
     */
    async scrollUntilStable(
        page: Page,
        itemSelector: string,
        maxScrolls = 10,
        waitMs = 1000
    ): Promise<number> {
        let previousCount = 0;
        let scrollCount = 0;

        while (scrollCount < maxScrolls) {
            await this.scrollToBottom(page);
            await page.waitForTimeout(waitMs); // give lazy-loaded content time to render

            const currentCount = await page.locator(itemSelector).count();
            scrollCount++;

            if (currentCount === previousCount) {
                log.info({ scrollCount, itemCount: currentCount }, "Content stopped growing, stopping scroll");
                break;
            }

            log.info({ scrollCount, itemCount: currentCount }, "New content loaded, continuing scroll");
            previousCount = currentCount;
        }

        if (scrollCount === maxScrolls) {
            log.warn({ maxScrolls }, "Reached max scroll limit, stopping");
        }

        return previousCount;
    }

    async screenshot(page: Page, filename: string): Promise<string> {
        const dir = path.join(process.cwd(), "tmp", "screenshots");
        await fs.mkdir(dir, { recursive: true });

        const filepath = path.join(dir, filename);
        await page.screenshot({ path: filepath, fullPage: true });

        log.info({ filepath }, "Screenshot captured");
        return filepath;
    }

    async withErrorScreenshot<T>(
        page: Page,
        label: string,
        fn: () => Promise<T>
    ): Promise<T> {
        try {
            return await fn();
        } catch (err) {
            const filename = `error-${label}-${Date.now()}.png`;
            await this.screenshot(page, filename);
            log.error({ label, err }, "Action failed, screenshot captured for debugging");
            throw err;
        }
}
}

/**
 * Runs a function with a fully managed browser lifecycle — launches,
 * provides a page, and guarantees close() runs even on error.
 */
export async function withBrowserPage<T>(
  fn: (page: Page, controller: BrowserController) => Promise<T>
): Promise<T> {
  const controller = new BrowserController();
  await controller.launch();

  try {
    const page = await controller.newPage();
    return await fn(page, controller);
  } finally {
    await controller.close();
  }
}