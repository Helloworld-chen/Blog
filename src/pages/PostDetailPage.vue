<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { usePageMeta } from "../composables/usePageMeta.js";
import { extractHeadings, markdownToHtml } from "../services/markdown.js";
import {
  getAdjacentPosts,
  getPostBySlug,
  getRelatedPosts
} from "../services/postService.js";

const route = useRoute();

const post = ref(null);
const loading = ref(true);
const error = ref("");
const relatedPosts = ref([]);
const adjacent = ref({ previous: null, next: null });
const contentRef = ref(null);
const readingProgress = ref(0);

const contentHtml = computed(() => markdownToHtml(post.value?.markdown || ""));
const headings = computed(() => extractHeadings(post.value?.markdown || ""));
const readingProgressPercent = computed(() => Math.round(readingProgress.value * 100));

usePageMeta(() => ({
  title: post.value ? `${post.value.title} | Tom的个人博客` : "Tom的个人博客 | 文章详情",
  description: post.value?.description || post.value?.excerpt || "阅读 Tom的个人博客 的精选文章。"
}));

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateReadingProgress() {
  if (!contentRef.value) {
    readingProgress.value = 0;
    return;
  }

  const rect = contentRef.value.getBoundingClientRect();
  const viewport = window.innerHeight || 1;
  const progressStart = viewport - rect.top;
  const progressTotal = rect.height + viewport * 0.65;
  const progress = progressTotal > 0 ? progressStart / progressTotal : 0;
  readingProgress.value = clamp(progress, 0, 1);
}

function scrollToHeading(id) {
  const target = document.getElementById(id);
  if (!target) return;

  const top = target.getBoundingClientRect().top + window.scrollY - 100;
  window.scrollTo({
    top,
    behavior: "smooth"
  });
}

async function loadPost() {
  loading.value = true;
  error.value = "";
  post.value = null;
  readingProgress.value = 0;

  try {
    const slug = route.params.slug;
    const result = await getPostBySlug(slug);
    if (!result) {
      error.value = "未找到该文章。";
      return;
    }

    post.value = result;
    [relatedPosts.value, adjacent.value] = await Promise.all([
      getRelatedPosts(result.slug, result.tag, 3),
      getAdjacentPosts(result.slug)
    ]);
    await nextTick();
    updateReadingProgress();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载失败";
  } finally {
    loading.value = false;
  }
}

watch(() => route.params.slug, loadPost);

onMounted(() => {
  loadPost();
  window.addEventListener("scroll", updateReadingProgress, { passive: true });
  window.addEventListener("resize", updateReadingProgress);
});

onUnmounted(() => {
  window.removeEventListener("scroll", updateReadingProgress);
  window.removeEventListener("resize", updateReadingProgress);
});
</script>

<template>
  <section v-if="loading" class="hero mini-hero">
    <h1>文章加载中...</h1>
  </section>

  <section v-else-if="error" class="hero mini-hero">
    <p class="kicker">NOT FOUND</p>
    <h1>{{ error }}</h1>
    <p class="hero-desc">你可以返回首页继续浏览文章。</p>
    <div class="hero-actions">
      <RouterLink class="btn primary" to="/">回到首页</RouterLink>
    </div>
  </section>

  <article v-else class="post-detail">
    <div class="reading-progress" aria-label="阅读进度">
      <span :style="{ width: `${readingProgressPercent}%` }"></span>
    </div>

    <div class="post-detail-layout">
      <div class="post-main">
        <header class="post-detail-header">
          <p class="post-meta">
            {{ post.date }} ·
            <RouterLink class="post-tag-link" :to="`/tags/${encodeURIComponent(post.tag)}`">
              {{ post.tag }}
            </RouterLink>
            · {{ post.readingTime }} 分钟阅读
          </p>
          <h1>{{ post.title }}</h1>
          <p class="hero-desc">{{ post.excerpt }}</p>
        </header>

        <section ref="contentRef" class="post-body" v-html="contentHtml"></section>

        <nav class="post-nav">
          <RouterLink v-if="adjacent.previous" class="btn ghost" :to="`/post/${adjacent.previous.slug}`">
            ← {{ adjacent.previous.title }}
          </RouterLink>
          <RouterLink class="btn ghost" to="/posts">返回文章列表</RouterLink>
          <RouterLink v-if="adjacent.next" class="btn ghost" :to="`/post/${adjacent.next.slug}`">
            {{ adjacent.next.title }} →
          </RouterLink>
        </nav>

        <section class="post-cta">
          <h2>继续阅读</h2>
          <div class="hero-actions">
            <RouterLink class="btn ghost" :to="`/tags/${encodeURIComponent(post.tag)}`">
              查看更多「{{ post.tag }}」文章
            </RouterLink>
            <RouterLink class="btn ghost" to="/posts">回到完整归档页</RouterLink>
          </div>
        </section>

        <section v-if="relatedPosts.length" class="related-posts">
          <h2>相关阅读</h2>
          <div class="post-grid related-grid">
            <article v-for="item in relatedPosts" :key="item.slug" class="post-card">
              <RouterLink class="post-card-link" :to="`/post/${item.slug}`">
                <div class="post-meta">{{ item.date }} · {{ item.tag }}</div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.excerpt }}</p>
              </RouterLink>
            </article>
          </div>
        </section>
      </div>

      <aside v-if="headings.length" class="post-toc">
        <h2>目录</h2>
        <ul>
          <li
            v-for="heading in headings"
            :key="heading.id"
            :class="{ sub: heading.level === 3 }"
          >
            <button type="button" @click="scrollToHeading(heading.id)">
              {{ heading.text }}
            </button>
          </li>
        </ul>
      </aside>
    </div>
  </article>
</template>
