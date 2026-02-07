import { expect, test } from "@playwright/test";

test("tag keyword URL falls back to in-tag filtering when no exact title match", async ({ page }) => {
  const keyword = `zzz-no-hit-${Date.now()}`;

  await page.goto(`/tags/%E5%89%8D%E7%AB%AF/${keyword}`);

  await expect(page).toHaveURL(new RegExp(`/tags/%E5%89%8D%E7%AB%AF/${keyword}$`));
  await expect(page.getByRole("heading", { name: "# 前端" })).toBeVisible();
  await expect(page.locator("#searchInput")).toHaveValue(keyword);
  await expect(page.locator(".post-detail")).toHaveCount(0);
  await expect(page.getByText("标签 前端 下暂无匹配文章。")).toBeVisible();
});
