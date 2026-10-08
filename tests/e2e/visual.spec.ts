import { expect, test } from "@playwright/test";
// Visual regression on the product surfaces with the canvas swapped for the poster (WebGL output is not bit-stable across GPUs).
for (const view of ["map", "growth", "heat", "plan", "species", "budget"]) {
  test(`visual: ${view}`, async ({ page }) => {
    await page.goto(`/?gfx=off&skip=1&view=${view}&year=2040&month=7&hour=15`); await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}" });
    await expect(page.getByTestId("hud")).toBeVisible(); await expect(page.getByTestId("hud")).toHaveCSS("opacity", "1"); await page.waitForTimeout(400); await expect(page).toHaveScreenshot(`${view}.png`);
  });
}
