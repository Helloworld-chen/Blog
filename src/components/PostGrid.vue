<script setup>
import { ref } from "vue";
import PostCard from "./PostCard.vue";

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const activeCard = ref(null);
let cardRaf = 0;
let lastCardX = 0;
let lastCardY = 0;

function trackCardGlow(event) {
  if (reducedMotionQuery.matches) return;
  const card = event.target.closest(".post-card");
  if (!card) return;

  activeCard.value = card;
  const rect = card.getBoundingClientRect();
  lastCardX = event.clientX - rect.left;
  lastCardY = event.clientY - rect.top;

  if (cardRaf) return;
  cardRaf = requestAnimationFrame(() => {
    cardRaf = 0;
    if (!activeCard.value) return;
    activeCard.value.style.setProperty("--mx", `${lastCardX}px`);
    activeCard.value.style.setProperty("--my", `${lastCardY}px`);
  });
}

function clearCardGlow(event) {
  const card = event.target.closest(".post-card");
  if (!card) return;
  const to = event.relatedTarget;
  if (to && card.contains(to)) return;

  card.style.removeProperty("--mx");
  card.style.removeProperty("--my");
  if (activeCard.value === card) activeCard.value = null;
}

defineProps({
  posts: {
    type: Array,
    required: true
  },
  emptyText: {
    type: String,
    default: "没有匹配内容，试试其他关键词或标签。"
  }
});
</script>

<template>
  <div
    v-if="posts.length"
    class="post-grid"
    @pointermove.passive="trackCardGlow"
    @pointerout.passive="clearCardGlow"
  >
    <PostCard v-for="post in posts" :key="post.slug" :post="post" />
  </div>
  <p v-else class="empty">{{ emptyText }}</p>
</template>
