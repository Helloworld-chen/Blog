export function normalizeKeyword(keyword = "") {
  return keyword.trim().toLowerCase();
}

export function sortByDateDesc(posts) {
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function extractTags(posts) {
  return [...new Set(posts.map((post) => post.tag))];
}

export function filterPosts(posts, { tag = "all", keyword = "" } = {}) {
  const normalizedKeyword = normalizeKeyword(keyword);
  return posts.filter((post) => {
    const hitTag = tag === "all" || post.tag === tag;
    const hitSearch =
      !normalizedKeyword ||
      `${post.title} ${post.excerpt} ${post.description || ""}`
        .toLowerCase()
        .includes(normalizedKeyword);
    return hitTag && hitSearch;
  });
}

export function getSuggestions(posts, { tag = "all", keyword = "" } = {}, limit = 6) {
  return filterPosts(posts, { tag, keyword }).slice(0, limit);
}

export function sortPosts(posts, sort = "date_desc") {
  const list = [...posts];
  if (sort === "read_asc") {
    return list.sort((a, b) => Number(a.readingTime || 0) - Number(b.readingTime || 0));
  }
  if (sort === "read_desc") {
    return list.sort((a, b) => Number(b.readingTime || 0) - Number(a.readingTime || 0));
  }
  return sortByDateDesc(list);
}

export function paginatePosts(posts, page = 1, pageSize = 9) {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 9;
  return posts.slice(0, safePage * safePageSize);
}
