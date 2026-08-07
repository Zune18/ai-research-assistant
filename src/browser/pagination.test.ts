import { describe, it, expect } from "vitest";
import { withBrowserPage } from "./controller";

describe("pagination handling", () => {
    it("navigates through multiple pages via a next-page selector", async () => {
        const titlesPerPage: string[][] = [];

        const pagesVisited = await withBrowserPage(async (page, controller) => {
            await controller.goto(page, "https://news.ycombinator.com/");

            return controller.paginateByClicking(
                page,
                "a.morelink",
                async (page, pageNumber) => {
                    const titles = await page.$$eval(".titleline > a", (els) =>
                        els.map((el) => el.textContent ?? "")
                    );
                    titlesPerPage.push(titles);
                },
                3 // cap at 3 pages
            );
        });

        expect(pagesVisited).toBe(3);
        expect(titlesPerPage).toHaveLength(3);
        // Each page should have actual story titles, and pages shouldn't be identical
        expect(titlesPerPage[0].length).toBeGreaterThan(0);
        expect(titlesPerPage[0]).not.toEqual(titlesPerPage[1]);
    }, 30000);

    it("stops scrolling once content stabilizes, respecting the max cap", async () => {
        const finalCount = await withBrowserPage(async (page, controller) => {
            await controller.goto(page, "https://the-internet.herokuapp.com/infinite_scroll");
            await controller.waitForSelector(page, ".jscroll-inner");
            return controller.scrollUntilStable(page, ".jscroll-added", 5, 500);
        });

        expect(finalCount).toBeGreaterThan(0);
    }, 30000);
});