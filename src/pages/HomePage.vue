<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import PostGrid from "../components/PostGrid.vue";
import { useHomeEasterEgg } from "../composables/useHomeEasterEgg.js";
import { usePageMeta } from "../composables/usePageMeta.js";
import { POSTS_UPDATED_EVENT } from "../services/events.js";
import { getAllPosts } from "../services/postService.js";
import { extractTags, filterPosts, getSuggestions } from "../utils/postFilters.js";

const posts = ref([]);
const loading = ref(true);
const error = ref("");

const keyword = ref("");
const selectedTag = ref("all");
const activeSuggestIndex = ref(-1);
const showSuggest = ref(false);
const searchWrap = ref(null);

const allTags = computed(() => ["all", ...extractTags(posts.value)]);
const filteredPosts = computed(() =>
  filterPosts(posts.value, {
    tag: selectedTag.value,
    keyword: keyword.value
  })
);
const featuredPosts = computed(() => filteredPosts.value.slice(0, 6));
const suggestions = computed(() =>
  getSuggestions(
    posts.value,
    {
      tag: selectedTag.value,
      keyword: keyword.value
    },
    6
  )
);
const popularTags = computed(() => {
  const counts = posts.value.reduce((acc, post) => {
    acc.set(post.tag, (acc.get(post.tag) || 0) + 1);
    return acc;
  }, new Map());
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));
});
const recentUpdates = computed(() => posts.value.slice(0, 4));
const summary = computed(() => ({
  totalPosts: posts.value.length,
  totalTags: Math.max(0, allTags.value.length - 1),
  latestDate: posts.value[0]?.date || "暂无"
}));

function closeSuggestions() {
  showSuggest.value = false;
  activeSuggestIndex.value = -1;
}

function chooseSuggestion(title) {
  keyword.value = title;
  closeSuggestions();
}

function handleSearchKeydown(event) {
  const items = suggestions.value;
  if (!items.length || !showSuggest.value) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeSuggestIndex.value = (activeSuggestIndex.value + 1) % items.length;
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    activeSuggestIndex.value = (activeSuggestIndex.value - 1 + items.length) % items.length;
  } else if (event.key === "Enter" && activeSuggestIndex.value >= 0) {
    event.preventDefault();
    chooseSuggestion(items[activeSuggestIndex.value].title);
  } else if (event.key === "Escape") {
    closeSuggestions();
  }
}

function setTag(tag) {
  selectedTag.value = tag;
  closeSuggestions();
}

function handleDocumentClick(event) {
  if (!searchWrap.value?.contains(event.target)) {
    closeSuggestions();
  }
}

async function loadPosts() {
  loading.value = true;
  error.value = "";

  try {
    posts.value = await getAllPosts();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载失败";
  } finally {
    loading.value = false;
  }
}

async function handlePostsUpdated() {
  await loadPosts();
}

function handleStorageUpdate() {
  handlePostsUpdated();
}

function handleVisibilityChange() {
  if (!document.hidden) {
    handlePostsUpdated();
  }
}

watch([keyword, selectedTag, suggestions], () => {
  activeSuggestIndex.value = -1;
  showSuggest.value = Boolean(keyword.value.trim() && suggestions.value.length);
});

useHomeEasterEgg();
usePageMeta(() => ({
  title: "Nebula Notes | 首页",
  description: "首页提供精选文章、快速筛选和标签导览，帮助你快速进入内容。"
}));

onMounted(async () => {
  await loadPosts();
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", handlePostsUpdated);
  window.addEventListener("storage", handleStorageUpdate);
  window.addEventListener(POSTS_UPDATED_EVENT, handlePostsUpdated);
});

onUnmounted(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("focus", handlePostsUpdated);
  window.removeEventListener("storage", handleStorageUpdate);
  window.removeEventListener(POSTS_UPDATED_EVENT, handlePostsUpdated);
});
</script>

<template>
  <section class="hero">
    <p class="kicker">FRONTEND BLOG DEMO</p>
    <h1>把灵感写成结构，把内容做成体验。</h1>
    <p class="hero-desc">
      这是一个博客前端页面示例：偏内容表达的排版、可筛选文章流、以及移动端友好的卡片布局。
    </p>
    <div class="hero-actions">
      <RouterLink class="btn primary" to="/posts">进入文章归档</RouterLink>
      <RouterLink class="btn ghost" to="/about">关于站点</RouterLink>
    </div>
  </section>

  <section class="overview-metrics home-metrics" aria-label="首页概览">
    <article class="metric-card">
      <p class="metric-label">已发布文章</p>
      <p class="metric-value">{{ summary.totalPosts }}</p>
    </article>
    <article class="metric-card">
      <p class="metric-label">标签数量</p>
      <p class="metric-value">{{ summary.totalTags }}</p>
    </article>
    <article class="metric-card">
      <p class="metric-label">最近更新时间</p>
      <p class="metric-value">{{ summary.latestDate }}</p>
    </article>
  </section>

  <section class="controls" id="posts">
    <div ref="searchWrap" class="search-wrap">
      <input
        id="searchInput"
        v-model="keyword"
        type="search"
        placeholder="搜索文章标题或摘要..."
        autocomplete="off"
        spellcheck="false"
        @keydown="handleSearchKeydown"
      />
      <ul
        id="searchSuggest"
        class="suggest-list"
        :class="{ hidden: !showSuggest }"
        aria-label="搜索建议"
      >
        <li
          v-for="(post, index) in suggestions"
          :key="post.slug"
          :class="{ active: index === activeSuggestIndex }"
          @mousedown.prevent="chooseSuggestion(post.title)"
        >
          {{ post.title }}
        </li>
      </ul>
    </div>

    <div class="tags" id="tagBar">
      <button
        v-for="tag in allTags"
        :key="tag"
        class="tag"
        :class="{ active: selectedTag === tag }"
        :data-tag="tag"
        @click="setTag(tag)"
      >
        {{ tag === "all" ? "全部" : tag }}
      </button>
    </div>
    <p class="home-summary">
      当前筛选命中 {{ filteredPosts.length }} 篇，首页展示前 {{ featuredPosts.length }} 篇。
      <RouterLink to="/posts">查看全部文章</RouterLink>
    </p>
  </section>

  <section>
    <p v-if="loading" class="empty">文章加载中...</p>
    <p v-else-if="error" class="empty">{{ error }}</p>
    <PostGrid v-else :posts="featuredPosts" />
  </section>

  <section class="home-side-notes">
    <article class="note-card">
      <h2>热门标签</h2>
      <ul>
        <li v-for="item in popularTags" :key="item.tag">
          <RouterLink :to="`/tags/${encodeURIComponent(item.tag)}`">{{ item.tag }}</RouterLink>
          <span>{{ item.count }} 篇</span>
        </li>
      </ul>
    </article>
    <article class="note-card">
      <h2>最近更新</h2>
      <ul>
        <li v-for="post in recentUpdates" :key="post.slug">
          <RouterLink :to="`/post/${post.slug}`">{{ post.title }}</RouterLink>
          <span>{{ post.date }}</span>
        </li>
      </ul>
    </article>
  </section>
</template>
