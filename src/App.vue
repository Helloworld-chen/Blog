<script setup>
import { ref, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const mobileNavOpen = ref(false);
const showAdminLink = import.meta.env.VITE_SHOW_ADMIN_LINK === "true";

function toggleMobileNav() {
  mobileNavOpen.value = !mobileNavOpen.value;
}

function closeMobileNav() {
  mobileNavOpen.value = false;
}

watch(
  () => route.fullPath,
  () => {
    closeMobileNav();
  }
);
</script>

<template>
  <div class="bg-orb orb-a"></div>
  <div class="bg-orb orb-b"></div>

  <header class="site-header">
    <div class="brand">Nebula Notes</div>
    <div class="header-actions">
      <button
        class="nav-toggle"
        type="button"
        :aria-expanded="mobileNavOpen ? 'true' : 'false'"
        aria-controls="siteNav"
        @click="toggleMobileNav"
      >
        菜单
      </button>
      <nav id="siteNav" class="site-nav" :class="{ open: mobileNavOpen }">
        <RouterLink to="/" @click="closeMobileNav">首页</RouterLink>
        <RouterLink :to="`/tags/${encodeURIComponent('前端')}`" @click="closeMobileNav">标签</RouterLink>
        <RouterLink to="/posts" @click="closeMobileNav">文章</RouterLink>
        <RouterLink to="/about" @click="closeMobileNav">关于</RouterLink>
        <RouterLink v-if="showAdminLink" to="/admin" @click="closeMobileNav">管理</RouterLink>
      </nav>
    </div>
  </header>

  <main>
    <RouterView />
  </main>

  <footer class="site-footer">
    <p>
      © 2026 Nebula Notes. 数据源支持本地内容与
      <code>/api/posts</code> 适配层。
    </p>
  </footer>
</template>
