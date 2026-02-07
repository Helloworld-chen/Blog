async function fetchApi(path, init = {}) {
  const headers = {
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(init.headers || {})
  };

  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new Error(payload?.message || `API 请求失败: ${path}`);
  }

  return payload;
}

export async function getAllPosts() {
  return fetchApi("/api/posts");
}

export async function getPostBySlug(slug) {
  return fetchApi(`/api/posts/${encodeURIComponent(slug)}`);
}

export async function getTags() {
  return fetchApi("/api/tags");
}

export async function getRelatedPosts(slug, tag, limit = 3) {
  return fetchApi(
    `/api/posts/${encodeURIComponent(slug)}/related?tag=${encodeURIComponent(tag)}&limit=${encodeURIComponent(limit)}`
  );
}

export async function getAdjacentPosts(slug) {
  return fetchApi(`/api/posts/${encodeURIComponent(slug)}/adjacent`);
}

export function getAllEditablePosts() {
  return fetchApi("/api/admin/posts");
}

export function upsertPost(post) {
  return fetchApi(`/api/admin/posts/${encodeURIComponent(post.slug)}`, {
    method: "PUT",
    body: JSON.stringify(post)
  });
}

export function deletePost(slug) {
  return fetchApi(`/api/admin/posts/${encodeURIComponent(slug)}`, {
    method: "DELETE"
  });
}

export function getLocalDraftStatus() {
  return {
    upsertCount: 0,
    deletedCount: 0
  };
}

export function clearLocalEdits() {
  throw new Error("API 模式下无需清空本地改动。");
}

export function getAdminSession() {
  return fetchApi("/api/admin/session");
}

export function loginAdmin(username, password) {
  return fetchApi("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export function logoutAdmin() {
  return fetchApi("/api/admin/logout", {
    method: "POST"
  });
}

export function getAdminOperations() {
  return fetchApi("/api/admin/operations");
}
