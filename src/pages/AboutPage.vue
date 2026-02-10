<script setup>
import { usePageMeta } from "../composables/usePageMeta.js";

usePageMeta({
  title: "Tom的个人博客 | 关于",
  description: "关于 Tom的个人博客：定位、内容原则、发布流程与技术实现。"
});
</script>

<template>
  <section class="hero mini-hero">
    <p class="kicker">ABOUT THIS SITE</p>
    <h1>关于 Tom的个人博客</h1>
    <p class="hero-desc">
      Tom的个人博客 是一个以内容表达为中心的博客前端示例，目标是平衡阅读体验、工程可维护性与后续 API
      扩展能力。
    </p>
  </section>

  <section class="about-grid">
    <article class="about-card">
      <h2>站点定位</h2>
      <p>面向前端开发者与独立创作者，提供“可执行、可复用”的内容结构与交付方法。</p>
    </article>
    <article class="about-card">
      <h2>内容原则</h2>
      <p>每篇内容都要有明确问题、可落地步骤与可验证结果，避免只给概念不给路径。</p>
    </article>
    <article class="about-card">
      <h2>更新节奏</h2>
      <p>按周维护主题文章，优先沉淀能复用到真实项目中的实践清单与模板。</p>
    </article>
  </section>

  <section class="about-grid about-grid-wide">
    <article class="about-card">
      <h2>发布流程</h2>
      <ol>
        <li>选题与目标定义</li>
        <li>摘要、SEO 描述与正文草稿</li>
        <li>后台自检：结构、关键词、可读性</li>
        <li>发布并复盘阅读反馈</li>
      </ol>
    </article>
    <article class="about-card">
      <h2>技术实现</h2>
      <p>
        当前前端基于 Vue 3 + Vue Router + Vite，数据源默认本地 JSON/Markdown，同时保留 API 适配能力，
        支持从静态内容逐步演进到后端化内容服务。
      </p>
    </article>
  </section>
</template>
