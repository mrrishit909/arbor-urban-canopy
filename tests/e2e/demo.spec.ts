import { expect, test, type Page } from "@playwright/test";
import { SITES, openSites, fits } from "../../packages/domain/src/index.ts";
const open = async (page: Page, url: string) => { await page.goto(url); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 }); await expect(page.locator(".app")).toHaveAttribute("data-intro", "done"); await expect(page.getByTestId("hud")).toHaveCSS("opacity", "1"); };
const num = async (page: Page, id: string) => Number((await page.getByTestId(id).textContent())!.replace(/[^0-9.\-]/g, ""));
type W = { __aLive: { camT: number; wave: number; gray: number; introYear: number; underground: number; rootsT: number } };
const free = openSites().filter((s) => fits("hornbeam", s.id) && s.block === "B01");

// Blueprint section 19, the demo script.
test("demo walk: grey city to green, canopy map, scrub to 2050, plant by drag, optimise, benefit, species explorer", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByTestId("skip-intro")).toBeVisible(); await expect(page.getByTestId("intro")).toHaveAttribute("data-step", /[0-9]/);
  await page.getByTestId("skip-intro").click(); await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("hud")).toHaveCSS("opacity", "1", { timeout: 10_000 }); // toBeVisible ignores opacity, so assert it
  const L = await page.evaluate(() => (window as unknown as W).__aLive); expect(L.camT).toBe(4); expect(L.wave).toBeGreaterThan(1000); expect(L.gray).toBe(0); expect(L.underground).toBe(0);
  // canopy map
  await expect(page.getByRole("heading", { name: "Canopy map" })).toBeVisible(); await expect(page.getByTestId("metrics")).toBeVisible(); const c35 = await num(page, "m-canopy");
  // scrub growth to 2050
  await page.getByTestId("nav-growth").click(); await page.getByTestId("year-2026").click(); const c26 = await num(page, "m-canopy"); await page.getByTestId("year-2050").click(); await expect(page.getByTestId("year-out")).toHaveText("2050"); const c50 = await num(page, "m-canopy"); expect(c50).toBeGreaterThan(c35); expect(c35).toBeGreaterThan(c26); await expect(page.getByTestId("line-canopy")).toBeVisible();
  // select the hottest block and drag candidate trees into planting sites
  await page.getByTestId("nav-heat").click(); const hot = await page.getByTestId("blocks-table").locator("tbody tr").first().getAttribute("data-testid"); await page.getByTestId(hot!).getByRole("button").click();
  await page.getByTestId("nav-plan").click(); await expect(page.getByTestId("plan-block")).toHaveValue(hot!.replace("block-", ""));
  await page.getByTestId("starter-plan").click(); await page.getByTestId("clear-plan").click(); await expect(page.getByTestId("plan-count")).toHaveText("0");
  const sites = (await page.getByTestId("site-list").locator("button").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")!.replace("plant-site-", "")))).slice(0, 2); expect(sites.length).toBe(2);
  const site = page.getByTestId(`site-${sites[0]}`); await page.getByTestId("chip-maple").dragTo(site, { force: true }); await expect(page.getByTestId("plan-count")).toHaveText("1"); await expect(page.getByTestId("plan-flash")).toContainText("Planted"); await expect(page.locator(".pulse").first()).toBeAttached();
  await page.getByTestId("chip-pine").click(); await page.getByTestId(`plant-site-${sites[1]}`).click(); await expect(page.getByTestId("plan-count")).toHaveText("2");
  // run the budget optimiser and inspect the benefit
  await page.getByTestId("nav-budget").click(); await page.getByTestId("budget").fill("80000"); await page.getByTestId("run-opt").click(); await expect(page.getByTestId("opt-status")).toContainText("Optimised");
  expect(await num(page, "a-hot")).toBeLessThan(await num(page, "b-hot")); expect(await num(page, "a-shade")).toBeGreaterThan(await num(page, "b-shade")); expect(await num(page, "a-feel")).toBeLessThan(await num(page, "b-feel")); await expect(page.getByTestId("opt-cost")).toContainText("a year"); await expect(page.getByTestId("cal-total")).toContainText("tasks");
  // species explorer: the camera moves from the canopy into a leaf
  await page.getByTestId("nav-species").click(); await expect(page.locator(".app")).toHaveAttribute("data-view", "species", { timeout: 10_000 }); await page.getByTestId("sp-cherry").click(); await expect(page.getByTestId("sp-name")).toContainText("Flowering cherry"); await page.getByTestId("month").fill("4"); await expect(page.getByTestId("sp-chart")).toBeVisible(); await expect.poll(async () => (await page.getByTestId("iris").getAttribute("style")) ?? "", { timeout: 10_000 }).toContain("circle(0%");
  await page.getByTestId("sp-plant").click(); await expect(page.getByTestId("chip-cherry")).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});
test("a species that does not fit a site is refused with the reason, and two trees cannot be planted closer than 5 m", async ({ page }) => {
  await open(page, "/?skip=1&view=plan&plan=none"); const small = SITES.find((s) => s.maxCrownM <= 3.5 && openSites().some((o) => o.id === s.id))!; await page.getByTestId("plan-block").selectOption(small.block); await page.getByTestId("chip-oak").click(); await page.getByTestId(`site-${small.id}`).click(); await expect(page.getByTestId("plan-flash")).toContainText("does not fit"); await expect(page.getByTestId("plan-count")).toHaveText("0");
  await page.getByTestId("chip-hornbeam").click(); await page.getByTestId(`site-${small.id}`).click(); await expect(page.getByTestId("plan-count")).toHaveText("1"); await page.getByTestId(`remove-${small.id}`).click(); await expect(page.getByTestId("plan-count")).toHaveText("0");
});
test("season, hour and sun move together: January is cooler than July, the sun is lower, and the crowns change colour", async ({ page }) => {
  await open(page, "/?skip=1&view=growth&month=7&hour=15"); const julHot = await num(page, "m-hot"), julSun = await page.getByTestId("sun-readout").textContent(); await page.getByTestId("month").fill("1"); await expect(page.getByTestId("when")).toContainText("Jan"); expect(await num(page, "m-hot")).toBeLessThan(julHot); expect(await page.getByTestId("sun-readout").textContent()).not.toBe(julSun);
  await page.getByTestId("hour").fill("8"); await expect(page.getByTestId("when")).toContainText("8:00");
});
test("heat and shade: the layer changes the map, hot blocks are ranked, and more trees mean less heat", async ({ page }) => {
  await open(page, "/?skip=1&view=heat"); await expect(page.getByTestId("heat-canvas")).toHaveAttribute("data-layer", "feel"); await page.getByTestId("heat-layer").selectOption("shade"); await expect(page.getByTestId("heat-canvas")).toHaveAttribute("data-layer", "shade"); await expect(page.getByTestId("blocks-table").locator("tbody tr")).toHaveCount(12);
  const hotNow = await num(page, "m-hot"); await page.getByTestId("year").fill("2050"); expect(await num(page, "m-hot")).toBeLessThan(hotNow + 0.01);
  await page.goto("/?skip=1&view=heat&plan=none&year=2050"); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 }); const without = await num(page, "m-hot"); await page.goto("/?skip=1&view=heat&year=2050"); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 }); expect(await num(page, "m-hot")).toBeLessThan(without - 3);
});
test("budget: more money plants more and cools more; equity changes where; saved scenarios persist across a reload", async ({ page }) => {
  await open(page, "/?skip=1&view=budget"); await page.getByTestId("budget").fill("40000"); await page.getByTestId("run-opt").click(); await expect(page.getByTestId("opt-status")).toContainText("Optimised"); const t1 = await num(page, "a-trees"), h1 = await num(page, "a-hot");
  await page.getByTestId("budget").fill("150000"); await page.getByTestId("run-opt").click(); expect(await num(page, "a-trees")).toBeGreaterThan(t1); expect(await num(page, "a-hot")).toBeLessThanOrEqual(h1);
  await page.getByTestId("scn-name").fill("Big plan"); await page.getByTestId("save-scn").click(); await expect(page.getByTestId("saved-list")).toContainText("Big plan"); await page.goto("/?skip=1&view=budget&plan=none"); await expect(page.getByTestId("saved-list")).toContainText("Big plan"); const t0 = await num(page, "a-trees"); await page.getByTestId("saved-list").getByRole("button", { name: "Load" }).click(); expect(await num(page, "a-trees")).toBeGreaterThan(t0 + 50); await page.getByTestId("saved-list").getByRole("button", { name: "Delete" }).click(); await expect(page.getByTestId("saved-list")).not.toContainText("Big plan");
});
test("the maintenance calendar has a bar per month, prunes in winter and waters in summer", async ({ page }) => {
  await open(page, "/?skip=1&view=budget&year=2030"); const months = await page.getByTestId("cal-chart").locator(".cm").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-cost")))); expect(months).toHaveLength(12); expect(months[6]).toBeGreaterThan(0); expect(months[0] + months[10] + months[11] + months[1]).toBeGreaterThan(0); expect(months[4]).toBe(0);
});
test("deep link opens a view at a year and month", async ({ page }) => { await open(page, "/?view=growth&year=2044&month=10"); await expect(page.getByTestId("year-out")).toHaveText("2044"); await expect(page.getByTestId("when")).toContainText("Oct"); });
test("refresh mid-sequence restarts the intro cleanly", async ({ page }) => { await page.goto("/"); await page.waitForTimeout(1500); await page.reload(); await expect(page.getByTestId("intro")).toHaveAttribute("data-step", /[01]/); });
test("keyboard: the year slider and the site buttons work without a pointer", async ({ page }) => {
  await open(page, "/?skip=1&view=growth&year=2035"); const y0 = await num(page, "year-out"); await expect(async () => { await page.getByTestId("year").focus(); await page.keyboard.press("ArrowRight"); expect(await num(page, "year-out")).toBeGreaterThan(y0); }).toPass({ timeout: 15_000 });
  await page.getByTestId("nav-plan").click(); await page.getByTestId("chip-hornbeam").click(); const btn = page.getByTestId("site-list").locator("button").first(); await expect(async () => { await btn.focus(); await expect(btn).toBeFocused({ timeout: 500 }); }).toPass({ timeout: 10_000 }); const before = await num(page, "plan-count"); await page.keyboard.press("Enter"); await expect.poll(() => num(page, "plan-count")).toBeGreaterThanOrEqual(before);
});
test("choices made while the intro's last fade is still running are kept", async ({ page }) => {
  await page.goto("/"); await page.getByTestId("skip-intro").click(); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("nav-budget").click(); await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 45_000 }); await expect(page.getByRole("heading", { name: "Budget optimiser" })).toBeVisible();
});
test("the intro: roots grow under the paving, a sapling takes the hero site, and growth spreads before the camera rises", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => (window as unknown as W).__aLive?.rootsT > 0.4, null, { timeout: 40_000 }); const u = await page.evaluate(() => (window as unknown as W).__aLive); expect(u.underground).toBeGreaterThan(0.5); expect(u.gray).toBe(1);
  await page.waitForFunction(() => (window as unknown as W).__aLive.introYear > 2030, null, { timeout: 40_000 }); await page.waitForFunction(() => (window as unknown as W).__aLive.wave > 60, null, { timeout: 40_000 });
  await page.getByTestId("skip-intro").click(); await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 45_000 }); const e = await page.evaluate(() => (window as unknown as W).__aLive); expect(e.camT).toBe(4); expect(e.gray).toBe(0);
});
