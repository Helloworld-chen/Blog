<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import PostGrid from "../components/PostGrid.vue";
import { usePageMeta } from "../composables/usePageMeta.js";
import { POSTS_UPDATED_EVENT } from "../services/events.js";
import { getAllPosts } from "../services/postService.js";
import { extractTags, filterPosts } from "../utils/postFilters.js";

const route = useRoute();
const router = useRouter();

const posts = ref([]);
const loading = ref(true);
const error = ref("");
const keyword = ref("");

function safeDecode(value) {
  const text = String(value || "");
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

const currentTag = computed(() => safeDecode(route.params.tag));
const routeKeyword = computed(() => safeDecode(route.params.keyword));
const tags = computed(() => extractTags(posts.value));
const postsInCurrentTag = computed(() => posts.value.filter((post) => post.tag === currentTag.value));
const filteredPosts = computed(() =>
  filterPosts(posts.value, {
    tag: currentTag.value,
    keyword: keyword.value
  })
);
const relatedTags = computed(() => {
  const counts = posts.value.reduce((acc, post) => {
    if (post.tag === currentTag.value) return acc;
    acc.set(post.tag, (acc.get(post.tag) || 0) + 1);
    return acc;
  }, new Map());
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag, count]) => ({ tag, count }));
});
const latestDate = computed(() => postsInCurrentTag.value[0]?.date || "暂无");

usePageMeta(() => ({
  title: `Nebula Notes | 标签 - ${currentTag.value}`,
  description: routeKeyword.value
    ? `查看标签“${currentTag.value}”下与“${routeKeyword.value}”相关的文章。`
    : `查看标签“${currentTag.value}”下的文章。`
}));

function normalizeForMatch(value) {
  return String(value || "").trim().toLowerCase();
}

function toTimeValue(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

function pickNewestPost(postsForSameTitle) {
  return postsForSameTitle.reduce((newest, current) => {
    if (!newest) return current;
    return toTimeValue(current.date) > toTimeValue(newest.date) ? current : newest;
  }, null);
}

function applyRouteKeywordBehavior() {
  const targetKeyword = routeKeyword.value.trim();
  if (!targetKeyword) {
    keyword.value = "";
    return;
  }

  const normalizedKeyword = normalizeForMatch(targetKeyword);
  const exactTitleMatches = posts.value.filter(
    (post) =>
      post.tag === currentTag.value &&
      normalizeForMatch(post.title) === normalizedKeyword
  );
  const exactHit = pickNewestPost(exactTitleMatches);

  if (exactHit?.slug) {
    router.replace(`/post/${exactHit.slug}`);
    return;
  }

  keyword.value = targetKeyword;
}

async function loadPosts() {
  loading.value = true;
  error.value = "";
  try {
    posts.value = await getAllPosts();
    applyRouteKeywordBehavior();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载失败";
  } finally {
    loading.value = false;
  }
}

watch(
  () => [route.params.tag, route.params.keyword],
  () => {
    if (loading.value) return;
    applyRouteKeywordBehavior();
  }
);

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
    <p class="kicker">TAG ARCHIVE</p>
    <h1># {{ currentTag }}</h1>
    <p class="hero-desc">按标签聚合浏览相关文章，并支持关键词二次筛选。</p>

    <div class="overview-metrics tag-metrics">
      <article class="metric-card">
        <p class="metric-label">标签文章数</p>
        <p class="metric-value">{{ postsInCurrentTag.length }}</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">筛选后命中</p>
        <p class="metric-value">{{ filteredPosts.length }}</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">最新发布时间</p>
        <p class="metric-value">{{ latestDate }}</p>
      </article>
    </div>

    <div class="hero-actions">
      <RouterLink
        class="btn ghost"
        :to="{ name: 'posts', query: { tag: currentTag, q: keyword || undefined } }"
      >
        在文章页继续筛选
      </RouterLink>
    </div>

    <div class="tags route-tags">
      <RouterLink
        v-for="tag in tags"
        :key="tag"
        class="tag tag-link"
        :class="{ active: tag === currentTag }"
        :to="`/tags/${encodeURIComponent(tag)}`"
      >
        {{ tag }}
      </RouterLink>
    </div>
  </section>

  <section class="controls">
    <div class="search-wrap">
      <input
        id="searchInput"
        v-model="keyword"
        type="search"
        placeholder="在当前标签内搜索..."
        autocomplete="off"
        spellcheck="false"
      />
    </div>
    <p class="tag-summary">
      你正在浏览标签 <strong>{{ currentTag }}</strong>，可直接使用顶部关键词进行二次筛选。
    </p>
  </section>

  <section>
    <p v-if="loading" class="empty">文章加载中...</p>
    <p v-else-if="error" class="empty">{{ error }}</p>
    <PostGrid
      v-else
      :posts="filteredPosts"
      :empty-text="`标签 ${currentTag} 下暂无匹配文章。`"
    />
  </section>

  <section v-if="relatedTags.length" class="related-tags-panel">
    <h2>你可能还会看</h2>
    <div class="tags">
      <RouterLink
        v-for="item in relatedTags"
        :key="item.tag"
        class="tag tag-link"
        :to="`/tags/${encodeURIComponent(item.tag)}`"
      >
        {{ item.tag }} · {{ item.count }}
      </RouterLink>
    </div>
  </section>
</template>
