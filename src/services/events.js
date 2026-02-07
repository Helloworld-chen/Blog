export const POSTS_UPDATED_EVENT = "nebula:posts-updated";

export function emitPostsUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(POSTS_UPDATED_EVENT));
}
