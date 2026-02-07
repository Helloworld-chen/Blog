import { expect, test } from "@playwright/test";

test("admin can create a post and view it on frontend", async ({ page }) => {
  const id = Date.now();
  const slug = `e2e-admin-${id}`;
  const title = `E2E 新文章 ${id}`;

  await page.goto("/admin");
  await expect(page.getByRole("button", { name: "编辑" }).first()).toBeVisible();

  await page.getByTestId("admin-new-post").click();
  await page.getByTestId("admin-slug").fill(slug);
  await page.getByTestId("admin-title").fill(title);
  await page.getByTestId("admin-tag").fill("工程");
  await page.getByTestId("admin-excerpt").fill("这是一篇由 E2E 创建的测试文章摘要。");
  await page.getByTestId("admin-description").fill("E2E created post for regression check.");
  await page.getByTestId("admin-markdown").fill("# E2E 标题\n\n这是 E2E 自动化写入的正文。");
  await page.getByTestId("admin-save").click();

  await expect(page.locator(`[data-slug="${slug}"]`)).toBeVisible({ timeout: 15_000 });

  await page.goto("/");
  await page.getByPlaceholder("搜索文章标题或摘要...").fill(title);
  const targetCard = page.locator(".post-card", { hasText: title }).first();
  await expect(targetCard).toBeVisible();
  await targetCard.getByRole("link", { name: title }).click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.locator(".post-body")).toContainText("这是 E2E 自动化写入的正文");
});
