import { expect, test } from "@playwright/test";

test("posts page supports query sync, filtering and load more", async ({ page }) => {
  await page.goto("/posts");

  await expect(page.getByRole("heading", { name: "文章归档" })).toBeVisible();
  await expect(page.locator(".post-card")).toHaveCount(9);

  await page.getByRole("button", { name: "加载更多" }).click();
  await expect(page.locator(".post-card")).toHaveCount(10);

  await page.locator("#postsSearchInput").fill("JSON");
  await expect(page).toHaveURL(/q=JSON/);
  await expect(page.locator(".post-card")).toHaveCount(1);
  await expect(page.locator(".post-card", { hasText: "什么时候该从 JSON 迁移到 API" })).toBeVisible();
});
