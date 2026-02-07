import { expect, test } from "@playwright/test";

test("post detail shows toc and reading progress", async ({ page }) => {
  await page.goto("/post/readable-blog-structure");

  await expect(page.locator(".post-toc")).toBeVisible();
  await expect(page.locator(".post-toc button", { hasText: "结构优先于措辞" })).toBeVisible();
  await expect(page.locator(".reading-progress")).toBeVisible();

  const firstHeading = page.locator(".post-body h2").first();
  await page.locator(".post-toc button").first().click();
  await expect(firstHeading).toBeInViewport();
});
