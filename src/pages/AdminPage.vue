<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { usePageMeta } from "../composables/usePageMeta.js";
import {
  clearLocalEdits,
  deletePost,
  getAllEditablePosts,
  getAdminOperations,
  getAdminSession,
  getLocalDraftStatus,
  loginAdmin,
  logoutAdmin,
  upsertPost
} from "../services/postService.js";
import BaseSelect from "../components/BaseSelect.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return {
    slug: "",
    title: "",
    tag: "前端",
    date: todayString(),
    excerpt: "",
    description: "",
    readingTime: 5,
    markdown: ""
  };
}

function toTimeValue(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

const loading = ref(true);
const saving = ref(false);
const resetting = ref(false);
const authChecking = ref(false);
const authSubmitting = ref(false);
const error = ref("");
const editingSlug = ref("");
const posts = ref([]);
const draftStatus = ref({ upsertCount: 0, deletedCount: 0 });
const loggedIn = ref(import.meta.env.VITE_POST_SOURCE !== "api");
const isApiMode = import.meta.env.VITE_POST_SOURCE === "api";

const listKeyword = ref("");
const listTag = ref("all");
const listSort = ref("date_desc");
const operationLog = ref([]);
const toast = reactive({
  visible: false,
  text: "",
  type: "success"
});

const confirmOpen = ref(false);
const confirmTitle = ref("");
const confirmMessage = ref("");
const confirmConfirmText = ref("确认");
const confirmCancelText = ref("取消");
const confirmDanger = ref(false);
const confirmBusy = ref(false);
const confirmAction = ref(null);

const LOCAL_OPERATION_LOG_KEY = "nebula-admin-operation-log";
const TOAST_DURATION_MS = 2600;
let toastTimer = null;
const route = useRoute();
const router = useRouter();

const form = reactive(emptyForm());
const authForm = reactive({
  username: "",
  password: ""
});

const isEditing = computed(() => Boolean(editingSlug.value));
const currentAdminView = computed(() => {
  const name = typeof route.name === "string" ? route.name : "";
  if (name === "admin-list") return "list";
  if (name === "admin-new") return "new";
  return "hub";
});
const isHubView = computed(() => currentAdminView.value === "hub");
const isListView = computed(() => currentAdminView.value === "list");
const isNewView = computed(() => currentAdminView.value === "new");
const tagOptions = computed(() => ["all", ...new Set(posts.value.map((post) => post.tag))]);
const tagSelectOptions = computed(() => [
  { value: "all", label: "全部标签" },
  ...tagOptions.value.slice(1).map((tag) => ({ value: tag, label: tag }))
]);
const sortSelectOptions = [
  { value: "date_desc", label: "最新优先" },
  { value: "date_asc", label: "最早优先" },
  { value: "title_asc", label: "标题 A-Z" }
];
const tagStats = computed(() => {
  const counts = new Map();
  for (const post of posts.value) {
    const tag = String(post?.tag || "").trim();
    if (!tag) continue;
    counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .map(([tag, count]) => ({ tag, count }));
});
const displayedPosts = computed(() => {
  const keyword = normalizeText(listKeyword.value);
  const filtered = posts.value.filter((post) => {
    const hitTag = listTag.value === "all" || post.tag === listTag.value;
    const hitKeyword =
      !keyword ||
      `${post.title} ${post.slug}`.toLowerCase().includes(keyword);
    return hitTag && hitKeyword;
  });

  if (listSort.value === "date_asc") {
    return [...filtered].sort((a, b) => toTimeValue(a.date) - toTimeValue(b.date));
  }
  if (listSort.value === "title_asc") {
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
  }
  return [...filtered].sort((a, b) => toTimeValue(b.date) - toTimeValue(a.date));
});

const qualityChecks = computed(() => {
  const checks = [];
  const slugValue = form.slug.trim();
  const titleValue = form.title.trim();
  const excerptValue = form.excerpt.trim();
  const descriptionValue = form.description.trim();
  const markdownValue = form.markdown.trim();

  checks.push({
    id: "slug-format",
    label: "slug 使用小写字母、数字和短横线",
    pass: /^[a-z0-9-]+$/.test(slugValue),
    severity: "critical"
  });

  checks.push({
    id: "title-length",
    label: "标题建议 6-60 字",
    pass: titleValue.length >= 6 && titleValue.length <= 60,
    severity: "warning"
  });

  checks.push({
    id: "excerpt-length",
    label: "摘要建议 20-140 字",
    pass: excerptValue.length >= 20 && excerptValue.length <= 140,
    severity: "warning"
  });

  checks.push({
    id: "description-length",
    label: "SEO 描述建议 20-160 字",
    pass: !descriptionValue || (descriptionValue.length >= 20 && descriptionValue.length <= 160),
    severity: "warning"
  });

  checks.push({
    id: "markdown-heading",
    label: "正文包含一级标题（#）",
    pass: /^#\s+/m.test(markdownValue),
    severity: "critical"
  });

  return checks;
});

const publishReady = computed(() =>
  qualityChecks.value.every((item) => item.severity !== "critical" || item.pass)
);

function assignForm(post) {
  form.slug = post.slug || "";
  form.title = post.title || "";
  form.tag = post.tag || "";
  form.date = post.date || todayString();
  form.excerpt = post.excerpt || "";
  form.description = post.description || "";
  form.readingTime = Number(post.readingTime) > 0 ? Number(post.readingTime) : 5;
  form.markdown = post.markdown || "";
}

function resetForm() {
  editingSlug.value = "";
  assignForm(emptyForm());
}

function hideToast() {
  toast.visible = false;
}

function showToast(text, type = "success") {
  toast.text = String(text || "").trim();
  toast.type = type;
  toast.visible = Boolean(toast.text);
  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }
  toastTimer = window.setTimeout(() => {
    toast.visible = false;
  }, TOAST_DURATION_MS);
}

function restoreOperationLog() {
  if (isApiMode || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LOCAL_OPERATION_LOG_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    operationLog.value = parsed.slice(0, 10);
  } catch {
    operationLog.value = [];
  }
}

function persistOperationLog() {
  if (isApiMode || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_OPERATION_LOG_KEY, JSON.stringify(operationLog.value.slice(0, 10)));
  } catch {
    // Ignore storage failures in private mode or restricted environments.
  }
}

async function refreshOperationLog() {
  if (!isApiMode) return;
  if (!loggedIn.value) {
    operationLog.value = [];
    return;
  }

  try {
    const items = await getAdminOperations();
    operationLog.value = Array.isArray(items) ? items : [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : "操作记录加载失败";
    if (msg.includes("请先登录")) {
      loggedIn.value = false;
      operationLog.value = [];
      return;
    }
    error.value = msg;
  }
}

function addOperation(type, slug, detail) {
  if (isApiMode) return;
  operationLog.value.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    slug,
    detail,
    at: new Date().toLocaleString("zh-CN", { hour12: false })
  });
  operationLog.value = operationLog.value.slice(0, 10);
  persistOperationLog();
}

async function loadPosts() {
  if (isApiMode && !loggedIn.value) {
    loading.value = false;
    posts.value = [];
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    posts.value = await getAllEditablePosts();
    draftStatus.value = getLocalDraftStatus();
    applyEditorFromRoute();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "后台数据加载失败";
    if (isApiMode && error.value.includes("请先登录")) {
      loggedIn.value = false;
      posts.value = [];
    }
  } finally {
    loading.value = false;
  }
}

function newPost() {
  error.value = "";
  resetForm();
}

function readQueryText(value) {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

function applyEditorFromRoute() {
  if (!isNewView.value) return;

  const editSlug = readQueryText(route.query.edit);
  if (!editSlug) return;

  const matched = posts.value.find((post) => post.slug === editSlug);
  if (matched) {
    editingSlug.value = matched.slug;
    assignForm(matched);
    error.value = "";
    return;
  }

  if (!loading.value) {
    error.value = `未找到 slug 为 ${editSlug} 的文章。`;
  }
}

function goAdminList() {
  router.push({ name: "admin-list" });
}

function goAdminNew() {
  newPost();
  router.push({ name: "admin-new" });
}

function goAdminEdit(post) {
  router.push({ name: "admin-new", query: { edit: post.slug } });
}

function ensureUniqueSlug() {
  const duplicated = posts.value.some((post) => post.slug === form.slug && post.slug !== editingSlug.value);
  if (duplicated) {
    throw new Error("slug 已存在，请使用新的 slug。");
  }
}

async function submitForm() {
  if (isApiMode && !loggedIn.value) {
    error.value = "请先登录管理后台。";
    return;
  }

  const wasEditing = isEditing.value;
  saving.value = true;
  error.value = "";

  try {
    ensureUniqueSlug();

    await upsertPost({
      slug: form.slug,
      title: form.title,
      tag: form.tag,
      date: form.date,
      excerpt: form.excerpt,
      description: form.description,
      readingTime: form.readingTime,
      markdown: form.markdown
    });

    await loadPosts();
    if (isApiMode) {
      await refreshOperationLog();
    }
    editingSlug.value = form.slug;
    showToast(
      publishReady.value
        ? (wasEditing ? "文章更新成功。" : "文章创建成功。")
        : (wasEditing ? "文章更新成功，建议继续完善发布检查项。" : "文章创建成功，建议继续完善发布检查项。")
    );
    addOperation("保存", form.slug, wasEditing ? "更新文章" : "新建文章");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存失败";
    if (isApiMode && error.value.includes("请先登录")) {
      loggedIn.value = false;
    }
  } finally {
    saving.value = false;
  }
}

async function removePost(slug) {
  if (isApiMode && !loggedIn.value) {
    error.value = "请先登录管理后台。";
    return;
  }

  openConfirm({
    title: "确认删除？",
    message: `文章 ${slug} 将被删除，此操作不可撤销。`,
    confirmText: "删除",
    danger: true,
    action: async () => {
      error.value = "";
      await deletePost(slug);
      if (editingSlug.value === slug) {
        resetForm();
      }
      await loadPosts();
      if (isApiMode) {
        await refreshOperationLog();
      }
      showToast("文章删除成功。");
      addOperation("删除", slug, "文章已删除");
    }
  });
}

async function resetLocalEdits() {
  if (isApiMode) {
    error.value = "API 模式下不支持清空本地改动。";
    return;
  }

  openConfirm({
    title: "确认清空本地改动？",
    message: "将清空浏览器 localStorage 中的所有本地改动，并恢复默认内容。此操作不可撤销。",
    confirmText: "清空",
    danger: true,
    action: async () => {
      resetting.value = true;
      error.value = "";
      try {
        clearLocalEdits();
        resetForm();
        await loadPosts();
        showToast("已清空本地改动。");
        addOperation("重置", "-", "清空本地改动");
      } finally {
        resetting.value = false;
      }
    }
  });
}

function openConfirm({ title, message, confirmText, cancelText = "取消", danger = false, action }) {
  confirmTitle.value = String(title || "确认操作");
  confirmMessage.value = String(message || "");
  confirmConfirmText.value = String(confirmText || "确认");
  confirmCancelText.value = String(cancelText || "取消");
  confirmDanger.value = Boolean(danger);
  confirmAction.value = typeof action === "function" ? action : null;
  confirmOpen.value = true;
}

async function handleConfirm() {
  if (!confirmAction.value) {
    confirmOpen.value = false;
    return;
  }

  confirmBusy.value = true;
  try {
    await confirmAction.value();
    confirmOpen.value = false;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "操作失败";
    error.value = msg;
    showToast(msg, "error");
    // Keep dialog open for explicit user action (cancel/confirm).
  } finally {
    confirmBusy.value = false;
  }
}

function handleConfirmCancel() {
  confirmOpen.value = false;
}

async function checkSessionStatus() {
  if (!isApiMode) return;
  authChecking.value = true;
  error.value = "";

  try {
    const session = await getAdminSession();
    loggedIn.value = Boolean(session?.loggedIn);
  } catch {
    loggedIn.value = false;
  } finally {
    authChecking.value = false;
  }
}

async function submitLogin() {
  authSubmitting.value = true;
  error.value = "";

  try {
    const username = authForm.username.trim();
    await loginAdmin(username, authForm.password);
    loggedIn.value = true;
    authForm.password = "";
    await loadPosts();
    await refreshOperationLog();
    if (isNewView.value && readQueryText(route.query.edit)) {
      applyEditorFromRoute();
    } else {
      resetForm();
    }
    showToast("登录成功。");
    addOperation("登录", username || "-", "登录后台");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "登录失败";
  } finally {
    authSubmitting.value = false;
  }
}

async function handleLogout() {
  error.value = "";

  try {
    await logoutAdmin();
    loggedIn.value = false;
    posts.value = [];
    operationLog.value = [];
    resetForm();
    showToast("已退出管理后台。");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "退出失败";
  }
}

async function exitFromHub() {
  // API 模式：执行退出登录并停留在登录页，方便继续登录。
  if (isApiMode) {
    if (loggedIn.value) {
      await handleLogout();
    }
    return;
  }

  // 本地模式没有真实登录态，直接返回首页。
  router.push("/");
}

usePageMeta(() => ({
  title: currentAdminView.value === "hub" ? "Tom的个人博客 | 后台入口" : "Tom的个人博客 | 内容管理",
  description:
    currentAdminView.value === "hub"
      ? "后台入口：通过栏目跳转到文章列表管理页或新建文章页。"
      : "内容运营后台：新增、编辑、删除文章并执行发布前质量检查。"
}));

watch(
  () => route.fullPath,
  () => {
    applyEditorFromRoute();
  },
  { immediate: true }
);

onMounted(async () => {
  restoreOperationLog();
  await checkSessionStatus();
  await loadPosts();
  await refreshOperationLog();
  if (isNewView.value && !readQueryText(route.query.edit)) {
    resetForm();
  } else {
    applyEditorFromRoute();
  }
});

onBeforeUnmount(() => {
  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }
});
</script>

<template>
  <section class="hero mini-hero">
    <p class="kicker">CONTENT ADMIN</p>
    <h1>{{ isHubView ? "后台入口" : "内容运营后台" }}</h1>
    <p class="hero-desc">
      <template v-if="isHubView">
        <span>当前各标签文章数量：</span>
        <span v-if="tagStats.length" class="admin-tag-stats" aria-label="标签文章数量统计">
          <span v-for="item in tagStats" :key="item.tag" class="admin-tag-stat">
            {{ item.tag }} {{ item.count }} 篇
          </span>
        </span>
        <span v-else>暂无文章。</span>
      </template>
      <template v-else>
        <span v-if="isApiMode">当前内容发布到服务器，保存后对访客可见。</span>
        <span v-else>
          当前改动保存到浏览器 <code>localStorage</code>，仅影响本机预览。
          本地改动：新增/修改 {{ draftStatus.upsertCount }} 篇，删除 {{ draftStatus.deletedCount }} 篇。
        </span>
      </template>
    </p>
    <p v-if="isHubView && !isApiMode" class="admin-hub-note">
      当前改动保存到浏览器 <code>localStorage</code>，仅影响本机预览。
      本地改动：新增/修改 {{ draftStatus.upsertCount }} 篇，删除 {{ draftStatus.deletedCount }} 篇。
    </p>
    <div v-if="!isHubView" class="hero-actions">
      <RouterLink class="btn ghost" :to="{ name: 'admin' }">返回后台入口</RouterLink>
      <button
        v-if="isListView"
        class="btn ghost"
        type="button"
        data-testid="admin-new-post"
        :disabled="isApiMode && !loggedIn"
        @click="goAdminNew"
      >
        新建文章
      </button>
      <button
        v-if="isNewView"
        class="btn ghost"
        type="button"
        :disabled="isApiMode && !loggedIn"
        @click="goAdminList"
      >
        前往文章列表
      </button>
      <button
        v-if="!isApiMode"
        class="btn ghost"
        type="button"
        data-testid="admin-reset-edits"
        :disabled="resetting"
        @click="resetLocalEdits"
      >
        {{ resetting ? "重置中..." : "清空本地改动" }}
      </button>
      <button v-if="isApiMode && loggedIn" class="btn ghost" type="button" @click="handleLogout">
        退出登录
      </button>
    </div>
    <p v-if="error" class="admin-message error">{{ error }}</p>
  </section>

  <section v-if="isApiMode && authChecking" class="admin-panel admin-auth-panel">
    <h2>校验登录状态</h2>
    <p class="empty">正在检查管理员身份...</p>
  </section>

  <section v-else-if="isApiMode && !loggedIn" class="admin-panel admin-auth-panel">
    <h2>管理员登录</h2>
    <p class="empty">请输入后台账号与密码后再进行发布操作。</p>
    <form class="admin-auth-form" autocomplete="off" @submit.prevent="submitLogin">
      <label>
        <span>账号</span>
        <input
          v-model.trim="authForm.username"
          type="text"
          autocomplete="off"
          spellcheck="false"
          required
        />
      </label>
      <label>
        <span>密码</span>
        <input
          v-model="authForm.password"
          type="password"
          autocomplete="off"
          spellcheck="false"
          required
        />
      </label>
      <button class="btn primary" type="submit" :disabled="authSubmitting">
        {{ authSubmitting ? "登录中..." : "登录后台" }}
      </button>
    </form>
  </section>

  <template v-else>
    <section v-if="isHubView" class="admin-entry-grid">
      <article class="admin-panel admin-entry-card">
        <div class="admin-entry-main">
          <h2>文章列表</h2>
          <p>进入后可筛选、编辑、删除已有文章。</p>
        </div>
        <RouterLink class="admin-entry-link" :to="{ name: 'admin-list' }" aria-label="进入文章列表管理">
          →
        </RouterLink>
      </article>
      <article class="admin-panel admin-entry-card">
        <div class="admin-entry-main">
          <h2>新建文章</h2>
          <p>进入后可创建文章，填写内容并执行发布检查。</p>
        </div>
        <RouterLink class="admin-entry-link" :to="{ name: 'admin-new' }" aria-label="进入新建文章页面">
          →
        </RouterLink>
      </article>
    </section>
    <div v-if="isHubView" class="admin-hub-actions">
      <button class="btn ghost" type="button" @click="exitFromHub">退出登录</button>
    </div>

    <section v-if="isListView" class="admin-layout-single">
      <article class="admin-panel">
        <h2>文章列表</h2>

        <div class="admin-list-toolbar">
          <input
            v-model.trim="listKeyword"
            type="search"
            placeholder="按标题或 slug 过滤..."
          />
          <BaseSelect v-model="listTag" :options="tagSelectOptions" aria-label="筛选标签" />
          <BaseSelect v-model="listSort" :options="sortSelectOptions" aria-label="排序方式" />
        </div>

        <p v-if="loading" class="empty">加载中...</p>
        <p v-else-if="error" class="empty">{{ error }}</p>
        <ul v-else-if="displayedPosts.length" class="admin-list">
          <li
            v-for="post in displayedPosts"
            :key="post.slug"
            :class="{ active: post.slug === editingSlug }"
            :data-slug="post.slug"
          >
            <div class="admin-list-text">
              <strong>{{ post.title }}</strong>
              <span>{{ post.date }} · {{ post.tag }} · {{ post.slug }}</span>
            </div>
            <div class="admin-actions">
              <button class="tag" type="button" @click="goAdminEdit(post)">编辑</button>
              <button class="tag danger" type="button" @click="removePost(post.slug)">删除</button>
            </div>
          </li>
        </ul>
        <p v-else class="empty">当前筛选条件下没有文章。</p>
      </article>
    </section>

    <section v-if="isNewView" class="admin-layout-single">
      <article class="admin-panel">
        <h2>{{ isEditing ? `编辑：${editingSlug}` : "新建文章" }}</h2>
        <form class="admin-form" @submit.prevent="submitForm">
          <label>
            <span>slug</span>
            <input
              v-model.trim="form.slug"
              data-testid="admin-slug"
              type="text"
              required
              :disabled="isEditing"
              placeholder="my-post-slug"
            />
          </label>

          <label>
            <span>标题</span>
            <input v-model.trim="form.title" data-testid="admin-title" type="text" required />
          </label>

          <div class="admin-form-row">
            <label>
              <span>标签</span>
              <input v-model.trim="form.tag" data-testid="admin-tag" type="text" required />
            </label>

            <label>
              <span>日期</span>
              <input v-model="form.date" data-testid="admin-date" type="date" required />
            </label>

            <label>
              <span>阅读时长(分钟)</span>
              <input
                v-model.number="form.readingTime"
                data-testid="admin-reading-time"
                min="1"
                max="60"
                type="number"
                required
              />
            </label>
          </div>

          <label>
            <span>摘要</span>
            <textarea v-model.trim="form.excerpt" data-testid="admin-excerpt" rows="3" required></textarea>
          </label>

          <label>
            <span>SEO 描述</span>
            <textarea v-model.trim="form.description" data-testid="admin-description" rows="2"></textarea>
          </label>

          <label>
            <span>正文 Markdown</span>
            <textarea v-model="form.markdown" data-testid="admin-markdown" rows="16" required></textarea>
          </label>

          <section class="quality-panel">
            <h3>发布检查</h3>
            <p class="quality-status" :class="{ ready: publishReady }">
              {{ publishReady ? "通过关键检查，可直接发布。" : "存在关键项未通过，请优先修复。" }}
            </p>
            <ul>
              <li
                v-for="item in qualityChecks"
                :key="item.id"
                :class="{ pass: item.pass, fail: !item.pass, critical: item.severity === 'critical' }"
              >
                <span>{{ item.pass ? "✓" : "✕" }}</span>
                <span>{{ item.label }}</span>
              </li>
            </ul>
          </section>

          <div class="hero-actions">
            <button class="btn primary" data-testid="admin-save" type="submit" :disabled="saving">
              {{ saving ? "保存中..." : "保存文章" }}
            </button>
            <button class="btn ghost" type="button" @click="newPost">重置表单</button>
          </div>
        </form>
      </article>
    </section>

    <section v-if="!isHubView" class="admin-log-panel">
      <h2>最近操作</h2>
      <p v-if="!operationLog.length" class="empty">暂无操作记录。</p>
      <ul v-else>
        <li v-for="item in operationLog" :key="item.id">
          <span class="type">{{ item.type }}</span>
          <span class="slug">{{ item.slug }}</span>
          <span class="detail">{{ item.detail }}</span>
          <time>{{ item.at }}</time>
        </li>
      </ul>
    </section>
  </template>

  <div v-if="toast.visible" class="admin-toast" :class="`is-${toast.type}`" role="status" aria-live="polite">
    <span>{{ toast.text }}</span>
    <button type="button" aria-label="关闭提示" @click="hideToast">×</button>
  </div>

  <ConfirmDialog
    v-model:open="confirmOpen"
    :title="confirmTitle"
    :message="confirmMessage"
    :confirm-text="confirmConfirmText"
    :cancel-text="confirmCancelText"
    :danger="confirmDanger"
    :busy="confirmBusy"
    @confirm="handleConfirm"
    @cancel="handleConfirmCancel"
  />
</template>
