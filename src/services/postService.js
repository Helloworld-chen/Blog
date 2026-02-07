import * as localAdapter from "./adapters/localAdapter.js";
import * as apiAdapter from "./adapters/apiAdapter.js";
import { emitPostsUpdated } from "./events.js";

const adapter = import.meta.env.VITE_POST_SOURCE === "api" ? apiAdapter : localAdapter;

export function getAllPosts() {
  return adapter.getAllPosts();
}

export function getPostBySlug(slug) {
  return adapter.getPostBySlug(slug);
}

export function getTags() {
  return adapter.getTags();
}

export function getRelatedPosts(slug, tag, limit = 3) {
  return adapter.getRelatedPosts(slug, tag, limit);
}

export function getAdjacentPosts(slug) {
  return adapter.getAdjacentPosts(slug);
}

export function getAllEditablePosts() {
  return adapter.getAllEditablePosts();
}

export async function upsertPost(post) {
  const result = await adapter.upsertPost(post);
  emitPostsUpdated();
  return result;
}

export async function deletePost(slug) {
  const result = await adapter.deletePost(slug);
  emitPostsUpdated();
  return result;
}

export function getLocalDraftStatus() {
  return adapter.getLocalDraftStatus();
}

export function clearLocalEdits() {
  const result = adapter.clearLocalEdits();
  emitPostsUpdated();
  return result;
}

export function getAdminSession() {
  if (typeof adapter.getAdminSession !== "function") {
    return Promise.resolve({ loggedIn: true, mode: "local" });
  }
  return adapter.getAdminSession();
}

export function loginAdmin(username, password) {
  if (typeof adapter.loginAdmin !== "function") {
    return Promise.resolve({ loggedIn: true, mode: "local" });
  }
  return adapter.loginAdmin(username, password);
}

export function logoutAdmin() {
  if (typeof adapter.logoutAdmin !== "function") {
    return Promise.resolve({ loggedIn: false, mode: "local" });
  }
  return adapter.logoutAdmin();
}

export function getAdminOperations() {
  if (typeof adapter.getAdminOperations !== "function") {
    return Promise.resolve([]);
  }
  return adapter.getAdminOperations();
}
