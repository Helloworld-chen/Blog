import { expect, test } from "@playwright/test";

test("top navigation routes to public sections and admin is hidden by default", async ({ page }) => {
  await page.goto("/");
  const headerNav = page.locator(".site-header .site-nav");

  await headerNav.getByRole("link", { name: "标签", exact: true }).click();
  await expect(page).toHaveURL(/\/tags\//);
  await expect(page.getByRole("heading", { name: "# 前端" })).toBeVisible();

  await headerNav.getByRole("link", { name: "文章", exact: true }).click();
  await expect(page).toHaveURL(/\/posts/);
  await expect(page.getByRole("heading", { name: "文章归档" })).toBeVisible();

  await headerNav.getByRole("link", { name: "关于", exact: true }).click();
  await expect(page).toHaveURL(/\/about/);
  await expect(page.getByRole("heading", { name: "关于 Nebula Notes" })).toBeVisible();

  await expect(headerNav.getByRole("link", { name: "管理", exact: true })).toHaveCount(0);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("heading", { name: "内容运营后台" })).toBeVisible();

  await headerNav.getByRole("link", { name: "首页", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "把灵感写成结构，把内容做成体验。" })).toBeVisible();
});
