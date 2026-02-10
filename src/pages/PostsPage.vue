<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import PostGrid from "../components/PostGrid.vue";
import BaseSelect from "../components/BaseSelect.vue";
import { usePageMeta } from "../composables/usePageMeta.js";
import { POSTS_UPDATED_EVENT } from "../services/events.js";
import { getAllPosts } from "../services/postService.js";
import { extractTags, filterPosts, paginatePosts, sortPosts } from "../utils/postFilters.js";

const route = useRoute();
const router = useRouter();

const DEFAULT_SORT = "date_desc";
const PAGE_SIZE = 9;
const sortOptions = new Set(["date_desc", "read_asc", "read_desc"]);
const sortSelectOptions = [
  { value: "date_desc", label: "最新发布优先" },
  { value: "read_asc", label: "阅读时长升序" },
  { value: "read_desc", label: "阅读时长降序" }
];

const posts = ref([]);
const loading = ref(true);
const error = ref("");

const keyword = ref("");
const selectedTag = ref("all");
const selectedSort = ref(DEFAULT_SORT);
const currentPage = ref(1);
let syncingFromRoute = false;

const tags = computed(() => ["all", ...extractTags(posts.value)]);
const filteredPosts = computed(() =>
  filterPosts(posts.value, {
    tag: selectedTag.value,
    keyword: keyword.value
  })
);
const orderedPosts = computed(() => sortPosts(filteredPosts.value, selectedSort.value));
const visiblePosts = computed(() => paginatePosts(orderedPosts.value, currentPage.value, PAGE_SIZE));
const hasMore = computed(() => visiblePosts.value.length < orderedPosts.value.length);
const latestDate = computed(() => posts.value[0]?.date || "暂无");

const resultSummary = computed(() => {
  if (loading.value) return "文章加载中...";
  if (error.value) return "文章加载失败";
  return `共 ${orderedPosts.value.length} 篇匹配文章，当前展示 ${visiblePosts.value.length} 篇`;
});

function normalizeQueryObject(queryLike) {
  const normalized = {};
  for (const [key, value] of Object.entries(queryLike || {})) {
    if (value == null) continue;
    const picked = Array.isArray(value) ? value[0] : value;
    const text = String(picked).trim();
    if (!text) continue;
    normalized[key] = text;
  }
  return normalized;
}

function applyRouteQuery() {
  const query = normalizeQueryObject(route.query);
  syncingFromRoute = true;
  keyword.value = query.q || "";
  selectedTag.value = query.tag || "all";
  selectedSort.value = sortOptions.has(query.sort) ? query.sort : DEFAULT_SORT;
  currentPage.value = 1;
  syncingFromRoute = false;
}

function syncQueryToRoute() {
  if (syncingFromRoute) return;

  const nextQuery = {};
  if (keyword.value.trim()) nextQuery.q = keyword.value.trim();
  if (selectedTag.value !== "all") nextQuery.tag = selectedTag.value;
  if (selectedSort.value !== DEFAULT_SORT) nextQuery.sort = selectedSort.value;

  const currentQuery = normalizeQueryObject(route.query);
  delete currentQuery.page;
  const nextSerialized = JSON.stringify(nextQuery);
  const currentSerialized = JSON.stringify(currentQuery);
  if (nextSerialized === currentSerialized) return;

  router.replace({ name: "posts", query: nextQuery });
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

function resetFilters() {
  keyword.value = "";
  selectedTag.value = "all";
  selectedSort.value = DEFAULT_SORT;
  currentPage.value = 1;
}

function setTag(tag) {
  selectedTag.value = tag;
}

function loadMore() {
  if (!hasMore.value) return;
  currentPage.value += 1;
}

watch(
  () => route.query,
  () => {
    applyRouteQuery();
  },
  { immediate: true }
);

watch([keyword, selectedTag, selectedSort], () => {
  if (!syncingFromRoute) currentPage.value = 1;
});

watch([keyword, selectedTag, selectedSort], () => {
  syncQueryToRoute();
});

usePageMeta(() => ({
  title: "Tom的个人博客 | 文章",
  description: "按关键词、标签和排序方式浏览全部文章。"
}));

onMounted(async () => {
  await loadPosts();
  window.addEventListener(POSTS_UPDATED_EVENT, loadPosts);
});

onUnmounted(() => {
  window.removeEventListener(POSTS_UPDATED_EVENT, loadPosts);
});
</script>

<template>
  <section class="hero mini-hero">
    <p class="kicker">POST ARCHIVE</p>
    <h1>文章归档</h1>
    <p class="hero-desc">
      使用关键词、标签和排序组合管理阅读路径，快速定位你想看的内容。
    </p>

    <div class="overview-metrics posts-metrics">
      <article class="metric-card">
        <p class="metric-label">总文章数</p>
        <p class="metric-value">{{ posts.length }}</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">标签数量</p>
        <p class="metric-value">{{ tags.length - 1 }}</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">最新发布</p>
        <p class="metric-value">{{ latestDate }}</p>
      </article>
    </div>
  </section>

  <section class="controls">
    <div class="posts-controls-row">
      <div class="search-wrap posts-search">
        <input
          id="postsSearchInput"
          v-model="keyword"
          type="search"
          placeholder="搜索标题、摘要或 SEO 描述..."
          autocomplete="off"
          spellcheck="false"
        />
      </div>

      <label class="posts-sort-wrap">
        <span>排序</span>
        <BaseSelect v-model="selectedSort" :options="sortSelectOptions" aria-label="文章排序方式" />
      </label>
    </div>

    <div class="tags">
      <button
        v-for="tag in tags"
        :key="tag"
        class="tag"
        :class="{ active: selectedTag === tag }"
        @click="setTag(tag)"
      >
        {{ tag === "all" ? "全部标签" : tag }}
      </button>
      <button class="tag ghost-tag" @click="resetFilters">重置筛选</button>
    </div>
    <p class="posts-summary">{{ resultSummary }}</p>
  </section>

  <section>
    <p v-if="loading" class="empty">文章加载中...</p>
    <p v-else-if="error" class="empty">{{ error }}</p>
    <PostGrid
      v-else
      :posts="visiblePosts"
      empty-text="没有匹配文章，请调整关键词或筛选条件。"
    />

    <div v-if="!loading && !error && hasMore" class="load-more-wrap">
      <button class="btn ghost" @click="loadMore">展开更多</button>
    </div>
  </section>
</template>
