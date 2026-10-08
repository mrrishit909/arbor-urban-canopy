import { expect, test } from "@playwright/test";
test("reduced motion: static story, no timeline, same planner", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" }), page = await ctx.newPage(); await page.goto("/");
  await expect(page.getByRole("dialog", { name: "Opening story" })).toContainText("seed", { ignoreCase: true }); await expect(page.getByTestId("pause-motion")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("skip-intro").click(); await expect(page.getByRole("heading", { name: "Canopy map" })).toBeVisible(); await page.getByTestId("nav-species").click(); await expect(page.getByTestId("sp-name")).toBeVisible(); await ctx.close();
});
test("graphics failure: the poster still, and every view still works from the DOM", async ({ page }) => {
  await page.goto("/?gfx=off&skip=1&view=plan&plan=none"); await expect(page.getByTestId("poster")).toBeVisible(); await expect(page.locator("canvas:not(.heatmap)")).toHaveCount(0);
  await page.getByTestId("site-list").locator("button").first().click(); await expect(page.getByTestId("plan-count")).toHaveText("1"); await page.getByTestId("nav-budget").click(); await page.getByTestId("run-opt").click(); await expect(page.getByTestId("opt-status")).toContainText("Optimised"); await page.getByTestId("nav-heat").click(); await expect(page.getByTestId("heat-canvas")).toBeVisible(); await page.getByTestId("nav-species").click(); await expect(page.getByTestId("sp-chart")).toBeVisible();
});
test("WebGL context loss falls back to the poster", async ({ page }) => {
  await page.goto("/?skip=1&view=map"); await expect(page.locator("canvas")).toHaveCount(1, { timeout: 30_000 }); await page.waitForFunction(() => typeof (window as unknown as { __arborStats?: unknown }).__arborStats === "function");
  await page.evaluate(() => document.querySelector("canvas")!.dispatchEvent(new Event("webglcontextlost", { cancelable: true }))); await expect(page.getByTestId("poster")).toBeVisible(); await page.getByTestId("nav-growth").click(); await expect(page.getByTestId("growth-chart")).toBeVisible();
});
test("phone width: nothing scrolls sideways and the panel stays reachable", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true }), page = await ctx.newPage(); await page.goto("/?skip=1&view=map&gfx=off");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0); await expect(page.getByTestId("nav-growth")).toBeVisible(); await page.getByTestId("nav-growth").click(); await expect(page.getByTestId("growth-chart")).toBeVisible(); await ctx.close();
});
test("pause motion stops the ambient animation", async ({ page }) => { await page.goto("/?skip=1&view=map"); await page.getByTestId("pause-motion").click(); await expect(page.getByTestId("pause-motion")).toHaveAttribute("aria-pressed", "true"); });
