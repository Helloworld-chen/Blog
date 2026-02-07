import { expect, test } from "@playwright/test";

test("tag keyword URL opens newest post when same title exists in same tag", async ({ page }) => {
  const id = Date.now();
  const title = `SameTitle-${id}`;
  const olderSlug = `same-title-old-${id}`;
  const newerSlug = `same-title-new-${id}`;

  await page.goto("/");
  await page.evaluate(({ oldSlug, newSlug, postTitle }) => {
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

    parsed.upserts[oldSlug] = {
      slug: oldSlug,
      title: postTitle,
      tag: "前端",
      date: "2025-01-01",
      excerpt: "较早文章",
      description: "older one",
      readingTime: 5,
      markdown: `# ${postTitle}\n\n较早文章`
    };
    parsed.upserts[newSlug] = {
      slug: newSlug,
      title: postTitle,
      tag: "前端",
      date: "2026-01-01",
      excerpt: "较新文章",
      description: "newer one",
      readingTime: 5,
      markdown: `# ${postTitle}\n\n较新文章`
    };
    parsed.deletedSlugs = Array.isArray(parsed.deletedSlugs) ? parsed.deletedSlugs : [];
    window.localStorage.setItem(key, JSON.stringify(parsed));
  }, { oldSlug: olderSlug, newSlug: newerSlug, postTitle: title });

  await page.goto(`/tags/%E5%89%8D%E7%AB%AF/${encodeURIComponent(title)}`);

  await expect(page).toHaveURL(new RegExp(`/post/${newerSlug}$`));
  await expect(page.locator(".post-detail-header h1")).toHaveText(title);
  await expect(page.locator(".post-body")).toContainText("较新文章");
});
