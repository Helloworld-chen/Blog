import { expect, test } from "@playwright/test";

test("home page renders and supports navigation", async ({ page }) => {
  await page.goto("/");

  const firstCard = page.locator(".post-card").first();

  await expect(page.getByRole("heading", { name: "把灵感写成结构，把内容做成体验。" })).toBeVisible();
  await expect(firstCard).toBeVisible();
  await firstCard.click();
  await expect(page.locator(".post-detail")).toBeVisible();
});
