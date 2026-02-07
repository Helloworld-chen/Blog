import { expect, test } from "@playwright/test";

test("admin quality checklist reflects form completeness", async ({ page }) => {
  const id = Date.now();
  const slug = `quality-check-${id}`;

  await page.goto("/admin");
  await expect(page.getByRole("button", { name: "编辑" }).first()).toBeVisible();
  await page.getByTestId("admin-new-post").click();

  await expect(page.locator(".quality-status")).toContainText("存在关键项未通过");

  await page.getByTestId("admin-slug").fill(slug);
  await page.getByTestId("admin-title").fill("质量检查验证文章");
  await page.getByTestId("admin-tag").fill("工程");
  await page.getByTestId("admin-excerpt").fill("这是一段满足长度要求的摘要，用于验证发布检查逻辑。");
  await page.getByTestId("admin-description").fill("这是一段用于 E2E 的 SEO 描述，长度满足发布检查建议。");
  await page.getByTestId("admin-markdown").fill("# 质量检查\n\n用于验证关键检查通过后的状态变化。");

  await expect(page.locator(".quality-status.ready")).toContainText("通过关键检查");
});
