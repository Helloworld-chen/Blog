<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { POSTS_UPDATED_EVENT } from "./services/events.js";
import { getAllPosts } from "./services/postService.js";

const route = useRoute();
const router = useRouter();
const mobileNavOpen = ref(false);
const showAdminLink = import.meta.env.VITE_SHOW_ADMIN_LINK === "true";
const isHomeRoute = computed(() => route.path === "/");
const isAdminRoute = computed(() => route.path.startsWith("/admin"));
const showBackButton = computed(() => !isHomeRoute.value && !isAdminRoute.value);
const activeHomePanel = ref("");
const homePosts = ref([]);

function readSingleParam(value) {
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
}

const currentPageLabel = computed(() => {
  const routeName = typeof route.name === "string" ? route.name : "";
  if (routeName === "tag") {
    const tag = readSingleParam(route.params.tag);
    return tag ? `标签：${tag}` : "标签页";
  }
  if (routeName === "post") return "文章详情";
  if (routeName === "posts") return "文章归档";
  if (routeName === "about") return "关于";
  if (routeName === "admin") return "后台入口";
  if (routeName === "admin-list") return "文章列表管理";
  if (routeName === "admin-new") return "新建/编辑文章";
  if (routeName === "not-found") return "页面不存在";
  return "当前页面";
});

const topTags = computed(() => {
  const counts = new Map();
  for (const post of homePosts.value) {
    if (!post?.tag) continue;
    counts.set(post.tag, (counts.get(post.tag) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
});

const recentPosts = computed(() => homePosts.value);

function sortByDateDesc(posts) {
  return [...posts].sort((a, b) => {
    const aTime = Date.parse(a?.date || "");
    const bTime = Date.parse(b?.date || "");
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
}

async function loadHomePanelData() {
  if (!isHomeRoute.value) return;
  try {
    const posts = await getAllPosts();
    homePosts.value = sortByDateDesc(posts);
  } catch {
    homePosts.value = [];
  }
}

function toggleMobileNav() {
  mobileNavOpen.value = !mobileNavOpen.value;
}

function closeHomePanel() {
  mobileNavOpen.value = false;
  activeHomePanel.value = "";
}

function toggleHomePanel(panel) {
  if (activeHomePanel.value === panel) {
    closeHomePanel();
    return;
  }

  activeHomePanel.value = panel;
  mobileNavOpen.value = panel === "menu";
}

function goBack() {
  if (window.history.length > 1) {
    router.back();
    return;
  }
  router.push("/");
}

watch(
  () => route.path,
  (path) => {
    closeHomePanel();
    if (path === "/") {
      loadHomePanelData();
    }
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener(POSTS_UPDATED_EVENT, loadHomePanelData);
});

onUnmounted(() => {
  window.removeEventListener(POSTS_UPDATED_EVENT, loadHomePanelData);
});
</script>

<template>
  <div class="bg-orb orb-a"></div>
  <div class="bg-orb orb-b"></div>

  <header class="site-header">
    <div class="brand">Tom的个人博客</div>
    <div v-if="isHomeRoute" class="home-topbar">
      <button
        class="topbar-btn"
        type="button"
        :class="{ 'is-active': activeHomePanel === 'recent' }"
        :aria-expanded="activeHomePanel === 'recent' ? 'true' : 'false'"
        aria-controls="homeRecentPanel"
        @click="toggleHomePanel('recent')"
      >
        最近更新
      </button>
      <button
        class="topbar-btn"
        type="button"
        :class="{ 'is-active': activeHomePanel === 'tags' }"
        :aria-expanded="activeHomePanel === 'tags' ? 'true' : 'false'"
        aria-controls="homeTagsPanel"
        @click="toggleHomePanel('tags')"
      >
        文章标签
      </button>
      <button
        class="topbar-btn"
        type="button"
        :class="{ 'is-active': activeHomePanel === 'menu' }"
        :aria-expanded="activeHomePanel === 'menu' ? 'true' : 'false'"
        aria-controls="siteNav"
        @click="toggleHomePanel('menu')"
      >
        导航
      </button>
    </div>
    <div class="header-actions" :class="{ 'with-back': showBackButton }">
      <button v-if="showBackButton" class="page-back-btn" type="button" aria-label="返回上一页" @click="goBack">
        ←
      </button>
      <span v-if="showBackButton" class="page-context">{{ currentPageLabel }}</span>
      <button
        class="nav-toggle"
        :class="{ 'is-home-route': isHomeRoute }"
        type="button"
        :aria-expanded="mobileNavOpen ? 'true' : 'false'"
        aria-controls="siteNav"
        @click="toggleMobileNav"
      >
        导航
      </button>
      <nav id="siteNav" class="site-nav" :class="{ open: mobileNavOpen }">
        <RouterLink to="/" @click="closeHomePanel">首页</RouterLink>
        <RouterLink to="/posts" @click="closeHomePanel">文章库</RouterLink>
        <RouterLink to="/about" @click="closeHomePanel">关于</RouterLink>
        <RouterLink v-if="showAdminLink" to="/admin" @click="closeHomePanel">管理</RouterLink>
      </nav>
    </div>
    <section
      v-if="isHomeRoute && activeHomePanel === 'tags'"
      id="homeTagsPanel"
      class="home-top-dropdown"
      aria-label="文章标签列表"
    >
      <RouterLink
        v-for="tag in topTags"
        :key="tag"
        :to="`/tags/${encodeURIComponent(tag)}`"
        @click="closeHomePanel"
      >
        {{ tag }}
      </RouterLink>
      <p v-if="!topTags.length" class="home-top-empty">暂无可展示标签</p>
    </section>
    <section
      v-if="isHomeRoute && activeHomePanel === 'recent'"
      id="homeRecentPanel"
      class="home-top-dropdown"
      aria-label="最近更新文章列表"
    >
      <RouterLink
        v-for="post in recentPosts"
        :key="post.slug"
        :to="`/post/${post.slug}`"
        @click="closeHomePanel"
      >
        <span class="home-top-item-title">{{ post.title }}</span>
        <span class="home-top-item-meta">{{ post.date || "未知日期" }} · {{ post.tag || "未分类" }}</span>
      </RouterLink>
      <p v-if="!recentPosts.length" class="home-top-empty">暂无最近更新文章</p>
    </section>
  </header>

  <main>
    <RouterView />
  </main>

  <footer class="site-footer">
    <p>
      © 2026 Tom的个人博客. 数据源支持本地内容与
      <code>/api/posts</code> 适配层。
    </p>
  </footer>
</template>
