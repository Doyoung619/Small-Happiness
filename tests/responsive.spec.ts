import { expect, test } from "@playwright/test";

const routes = ["/", "/search", "/add", "/explore", "/menu"];

for (const route of routes) {
  test(`${route} stays inside the viewport`, async ({ page }, testInfo) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.ok(), `HTTP response for ${route}`).toBeTruthy();
    await page.waitForTimeout(1_200);

    const layout = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const ignored = (element: Element) => {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return true;
        if (element.closest(".gm-style, .gm-style-moc, [data-playwright-ignore-overflow]")) return true;

        let parent = element.parentElement;
        while (parent && parent !== document.body) {
          const overflowX = getComputedStyle(parent).overflowX;
          if (["auto", "scroll", "hidden", "clip"].includes(overflowX)) return true;
          parent = parent.parentElement;
        }
        return false;
      };

      const overflowing = Array.from(document.querySelectorAll("body *"))
        .filter((element) => !ignored(element))
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === "string" ? element.className : "",
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          };
        })
        .filter(({ left, right, width }) => width > 1 && (left < -2 || right > viewportWidth + 2))
        .slice(0, 10);

      return {
        viewportWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        overflowing,
      };
    });

    await page.screenshot({
      path: testInfo.outputPath(`${testInfo.project.name}-${route === "/" ? "home" : route.slice(1)}.png`),
      fullPage: false,
    });

    expect(pageErrors, `page errors on ${route}`).toEqual([]);
    expect(consoleErrors, `console errors on ${route}`).toEqual([]);
    expect(layout.documentWidth, JSON.stringify(layout.overflowing)).toBeLessThanOrEqual(layout.viewportWidth + 2);
    expect(layout.bodyWidth, JSON.stringify(layout.overflowing)).toBeLessThanOrEqual(layout.viewportWidth + 2);
    expect(layout.overflowing, `overflowing elements on ${route}`).toEqual([]);
  });
}
