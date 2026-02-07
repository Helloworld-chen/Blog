<script setup>
import { usePageMeta } from "../composables/usePageMeta.js";

usePageMeta({
  title: "Nebula Notes | 页面不存在",
  description: "你访问的页面不存在，返回首页继续阅读。"
});
</script>

<template>
  <section class="hero mini-hero">
    <p class="kicker">404</p>
    <h1>页面不存在</h1>
    <p class="hero-desc">链接可能已失效或地址输入有误。</p>
    <div class="hero-actions">
      <RouterLink class="btn primary" to="/">回到首页</RouterLink>
      <RouterLink class="btn ghost" to="/about">关于站点</RouterLink>
    </div>
  </section>
</template>
