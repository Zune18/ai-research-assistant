import { describe, it, expect } from "vitest";
import { withBrowserPage } from "./controller";

describe("Playwright core actions", () => {
  it("waits for a selector to appear before proceeding", async () => {
    const heading = await withBrowserPage(async (page, controller) => {
      await controller.goto(page, "https://the-internet.herokuapp.com/");
      await controller.waitForSelector(page, "h1");
      return page.textContent("h1");
    });

    expect(heading).toContain("Welcome to the-internet");
  }, 20000);

  it("clicks a link and navigates to a new page", async () => {
    const newHeading = await withBrowserPage(async (page, controller) => {
      await controller.goto(page, "https://the-internet.herokuapp.com/");
      await controller.waitForSelector(page, 'a[href="/abtest"]');
      await controller.click(page, 'a[href="/abtest"]');
      await controller.waitForSelector(page, "h3");
      return page.textContent("h3");
    });

    expect(newHeading).toContain("A/B Test");
  }, 20000);

  it("scrolls to the bottom of a long page without throwing", async () => {
    await withBrowserPage(async (page, controller) => {
      await controller.goto(page, "https://the-internet.herokuapp.com/infinite_scroll"); 
      await controller.waitForSelector(page, ".jscroll-inner");
      await controller.scrollToBottom(page);
      // If scrollToBottom throws, the test fails
    });
  }, 20000);
});