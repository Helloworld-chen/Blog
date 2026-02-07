import { expect, test } from "@playwright/test";

test("tag keyword URL opens exact title match directly", async ({ page }) => {
  const id = Date.now();
  const slug = `tag-direct-open-${id}`;

  await page.goto("/");
  await page.evaluate((postSlug) => {
    const key = "nebula_notes_local_edits_v1";
    const raw = window.localStorage.getItem(key);
    let parsed = { upserts: {}, deletedSlugs: [] };

    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { upserts: {}, deletedSlugs: [] };
      }
    }

    parsed.upserts[postSlug] = {
      slug: postSlug,
      title: "Hello",
      tag: "前端",
      date: "2026-02-06",
      excerpt: "用于验证标签关键词直达文章。",
      description: "Tag keyword URL should open exact title match.",
      readingTime: 5,
      markdown: "# Hello\n\n标签关键词命中标题后应直接打开详情页。"
    };
    parsed.deletedSlugs = Array.isArray(parsed.deletedSlugs) ? parsed.deletedSlugs : [];
    window.localStorage.setItem(key, JSON.stringify(parsed));
  }, slug);

  await page.goto("/tags/%E5%89%8D%E7%AB%AF/Hello");

  await expect(page).toHaveURL(new RegExp(`/post/${slug}$`));
  await expect(page.locator(".post-detail")).toBeVisible();
  await expect(page.locator(".post-detail-header h1")).toHaveText("Hello");
});
