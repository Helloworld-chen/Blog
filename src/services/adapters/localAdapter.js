import { sortByDateDesc, extractTags } from "../../utils/postFilters.js";

const STORAGE_KEY = "nebula_notes_local_edits_v1";

let cachedBasePosts = null;
const contentCache = new Map();
let cachedEdits = null;

async function fetchContent(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`内容加载失败: ${path}`);
  }
  return response;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function emptyEdits() {
  return {
    upserts: {},
    deletedSlugs: []
  };
}

function normalizePost(post) {
  return {
    slug: String(post.slug || "").trim(),
    title: String(post.title || "").trim(),
    tag: String(post.tag || "").trim(),
    date: String(post.date || "").trim(),
    excerpt: String(post.excerpt || "").trim(),
    description: String(post.description || "").trim(),
    readingTime: Number(post.readingTime) > 0 ? Number(post.readingTime) : 5,
    markdown: String(post.markdown || "").trim()
  };
}

function toMeta(post) {
  return {
    slug: post.slug,
    title: post.title,
    tag: post.tag,
    date: post.date,
    excerpt: post.excerpt,
    description: post.description,
    readingTime: post.readingTime
  };
}

function loadEdits() {
  if (cachedEdits) return cachedEdits;

  if (!canUseLocalStorage()) {
    cachedEdits = emptyEdits();
    return cachedEdits;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedEdits = emptyEdits();
      return cachedEdits;
    }

    const parsed = JSON.parse(raw);
    cachedEdits = {
      upserts: parsed?.upserts && typeof parsed.upserts === "object" ? parsed.upserts : {},
      deletedSlugs: Array.isArray(parsed?.deletedSlugs) ? parsed.deletedSlugs : []
    };
    return cachedEdits;
  } catch {
    cachedEdits = emptyEdits();
    return cachedEdits;
  }
}

function persistEdits(edits) {
  cachedEdits = edits;
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
}

async function getBasePosts() {
  if (cachedBasePosts) return cachedBasePosts;

  const response = await fetchContent("/content/posts.json");
  const json = await response.json();
  cachedBasePosts = sortByDateDesc(json);
  return cachedBasePosts;
}

function applyEditsToPosts(basePosts) {
  const edits = loadEdits();
  const deleted = new Set(edits.deletedSlugs);

  const replaced = basePosts
    .filter((post) => !deleted.has(post.slug))
    .map((post) => {
      const upsert = edits.upserts[post.slug];
      return upsert ? toMeta(normalizePost(upsert)) : post;
    });

  const baseSlugSet = new Set(basePosts.map((post) => post.slug));
  const appended = Object.values(edits.upserts)
    .map(normalizePost)
    .filter((post) => !deleted.has(post.slug) && !baseSlugSet.has(post.slug))
    .map(toMeta);

  return sortByDateDesc([...replaced, ...appended]);
}

export async function getAllPosts() {
  const basePosts = await getBasePosts();
  return applyEditsToPosts(basePosts);
}

export async function getPostBySlug(slug) {
  const edits = loadEdits();
  if (edits.deletedSlugs.includes(slug)) return null;

  const edited = edits.upserts[slug];
  if (edited) return normalizePost(edited);

  const posts = await getBasePosts();
  const meta = posts.find((post) => post.slug === slug);
  if (!meta) return null;

  if (!contentCache.has(slug)) {
    const response = await fetchContent(`/content/posts/${slug}.md`);
    contentCache.set(slug, await response.text());
  }

  return {
    ...meta,
    markdown: contentCache.get(slug)
  };
}

export async function getTags() {
  const posts = await getAllPosts();
  return extractTags(posts);
}

export async function getRelatedPosts(slug, tag, limit = 3) {
  const posts = await getAllPosts();
  return posts.filter((post) => post.slug !== slug && post.tag === tag).slice(0, limit);
}

export async function getAdjacentPosts(slug) {
  const posts = await getAllPosts();
  const index = posts.findIndex((post) => post.slug === slug);
  if (index < 0) return { previous: null, next: null };

  return {
    previous: posts[index + 1] ?? null,
    next: posts[index - 1] ?? null
  };
}

export async function getAllEditablePosts() {
  const posts = await getAllPosts();
  const detailedPosts = await Promise.all(posts.map((post) => getPostBySlug(post.slug)));
  return detailedPosts.filter(Boolean);
}

export async function upsertPost(postInput) {
  const post = normalizePost(postInput);

  if (!post.slug || !post.title || !post.tag || !post.date || !post.excerpt || !post.markdown) {
    throw new Error("请填写完整文章信息（slug、标题、标签、日期、摘要、正文）。");
  }

  const edits = loadEdits();
  edits.upserts[post.slug] = post;
  edits.deletedSlugs = edits.deletedSlugs.filter((item) => item !== post.slug);

  contentCache.set(post.slug, post.markdown);
  persistEdits(edits);
  return post;
}

export async function deletePost(slug) {
  const basePosts = await getBasePosts();
  const edits = loadEdits();

  delete edits.upserts[slug];
  contentCache.delete(slug);

  const existsInBase = basePosts.some((post) => post.slug === slug);
  if (existsInBase && !edits.deletedSlugs.includes(slug)) {
    edits.deletedSlugs.push(slug);
  }

  if (!existsInBase) {
    edits.deletedSlugs = edits.deletedSlugs.filter((item) => item !== slug);
  }

  persistEdits(edits);
}

export function getLocalDraftStatus() {
  const edits = loadEdits();
  return {
    upsertCount: Object.keys(edits.upserts).length,
    deletedCount: edits.deletedSlugs.length
  };
}

export function clearLocalEdits() {
  persistEdits(emptyEdits());
  contentCache.clear();
}

export function getAdminSession() {
  return Promise.resolve({
    loggedIn: true,
    mode: "local"
  });
}

export function loginAdmin() {
  return Promise.resolve({
    loggedIn: true,
    mode: "local"
  });
}

export function logoutAdmin() {
  return Promise.resolve({
    loggedIn: false,
    mode: "local"
  });
}

export function getAdminOperations() {
  return Promise.resolve([]);
}
