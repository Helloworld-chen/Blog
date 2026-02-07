<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
});

function openPost() {
  router.push(`/post/${props.post.slug}`);
}

function isFromInteractiveTarget(event) {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const currentTarget = event.currentTarget;

  const interactive = target.closest(
    "a, button, input, select, textarea, summary, [role='button'], [role='link']"
  );
  return Boolean(interactive && interactive !== currentTarget);
}

function handleCardClick(event) {
  if (isFromInteractiveTarget(event)) return;
  openPost();
}

function handleCardKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (isFromInteractiveTarget(event)) return;
  event.preventDefault();
  openPost();
}

</script>

<template>
  <article
    class="post-card post-card-clickable"
    role="link"
    tabindex="0"
    :aria-label="`打开文章 ${post.title}`"
    @click="handleCardClick"
    @keydown="handleCardKeydown"
  >
    <div class="post-meta">
      {{ post.date }} ·
      <RouterLink class="post-tag-link" :to="`/tags/${encodeURIComponent(post.tag)}`" @click.stop>
        {{ post.tag }}
      </RouterLink>
    </div>
    <h3>
      <RouterLink class="post-title-link" :to="`/post/${post.slug}`" @click.stop>
        {{ post.title }}
      </RouterLink>
    </h3>
    <p>{{ post.excerpt }}</p>
  </article>
</template>
