import { expect, test } from "@playwright/test";

test("home easter egg appears after typing lxy", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("l");
  await page.keyboard.press("x");
  await page.keyboard.press("y");

  await expect(page.locator("#newYearEgg.visible .new-year-egg-text")).toBeVisible();
});
