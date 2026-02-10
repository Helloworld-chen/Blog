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
  title: "Tom的个人博客 | 首页",
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
    <h1>学而不思则罔，思而不学则殆。</h1>
    <p class="hero-desc">
      这里记录学习与思考的过程：用标签与关键词快速筛选内容，打开导航进入归档与关于页面。
      向下滚动，从最近更新开始阅读。
    </p>
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

</template>
