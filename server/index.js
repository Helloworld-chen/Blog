import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import express from "express";

const app = express();

const API_PORT = Number(process.env.API_PORT || 8787);
const CONTENT_ROOT = path.resolve(process.cwd(), process.env.CONTENT_ROOT || "public/content");
const POSTS_JSON_PATH = path.join(CONTENT_ROOT, "posts.json");
const POSTS_DIR = path.join(CONTENT_ROOT, "posts");
const ADMIN_DATA_ROOT = path.resolve(process.cwd(), process.env.ADMIN_DATA_ROOT || ".runtime/admin");
const SESSIONS_JSON_PATH = path.join(ADMIN_DATA_ROOT, "sessions.json");
const OPERATIONS_JSON_PATH = path.join(ADMIN_DATA_ROOT, "operations.json");
const ADMIN_OPERATION_LOG_LIMIT = Number(process.env.ADMIN_OPERATION_LOG_LIMIT || 200);

const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || "admin");
const configuredAdminPassword = process.env.ADMIN_PASSWORD != null ? String(process.env.ADMIN_PASSWORD) : "";
const WEAK_PASSWORD_SET = new Set([
  "admin",
  "admin123",
  "admin123456",
  "password",
  "password123",
  "qwerty",
  "123456",
  "12345678",
  "changeme",
  "change-me"
]);

function validateAdminPassword(password) {
  if (password.length < 12) {
    return "长度至少 12 位。";
  }

  const normalized = password.trim().toLowerCase();
  if (WEAK_PASSWORD_SET.has(normalized)) {
    return "不能使用常见弱密码。";
  }

  const complexity = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length;

  if (complexity < 3) {
    return "至少包含以下 4 类中的 3 类：小写字母、大写字母、数字、符号。";
  }

  return "";
}

const configuredPasswordError = configuredAdminPassword
  ? validateAdminPassword(configuredAdminPassword)
  : "";

if (configuredPasswordError) {
  console.error(`[api] ADMIN_PASSWORD 不符合安全要求：${configuredPasswordError}`);
  process.exit(1);
}

const USING_GENERATED_ADMIN_PASSWORD = !configuredAdminPassword;
const ADMIN_PASSWORD = configuredAdminPassword || crypto.randomBytes(24).toString("base64url");
const ADMIN_SESSION_COOKIE = String(process.env.ADMIN_SESSION_COOKIE || "nebula_admin_session");
const ADMIN_SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL_MS || 8 * 60 * 60 * 1000);
const ADMIN_COOKIE_SECURE = String(process.env.ADMIN_COOKIE_SECURE || "false") === "true";

const sessions = new Map();
let operationLog = [];

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

function isValidSlug(slug) {
  return /^[a-z0-9-]+$/.test(String(slug || "").trim());
}

function sortByDateDesc(posts) {
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function normalizeMeta(postInput) {
  const post = postInput && typeof postInput === "object" ? postInput : {};
  return {
    slug: String(post.slug || "").trim(),
    title: String(post.title || "").trim(),
    tag: String(post.tag || "").trim(),
    date: String(post.date || "").trim(),
    excerpt: String(post.excerpt || "").trim(),
    description: String(post.description || "").trim(),
    readingTime: Number(post.readingTime) > 0 ? Number(post.readingTime) : 5
  };
}

function normalizePost(postInput) {
  return {
    ...normalizeMeta(postInput),
    markdown: String(postInput?.markdown || "").trim()
  };
}

function validatePost(post) {
  if (!isValidSlug(post.slug)) {
    return "slug 仅支持小写字母、数字和短横线。";
  }
  if (!post.title || !post.tag || !post.date || !post.excerpt || !post.markdown) {
    return "请填写完整文章信息（slug、标题、标签、日期、摘要、正文）。";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date)) {
    return "日期格式应为 YYYY-MM-DD。";
  }
  return "";
}

async function readPostsMeta() {
  const raw = await fs.readFile(POSTS_JSON_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("posts.json 数据格式无效，必须是数组。");
  }
  return sortByDateDesc(parsed.map(normalizeMeta).filter((post) => post.slug));
}

async function writePostsMeta(posts) {
  const normalized = sortByDateDesc(posts.map(normalizeMeta));
  const content = `${JSON.stringify(normalized, null, 2)}\n`;
  const tempPath = `${POSTS_JSON_PATH}.tmp`;
  await fs.writeFile(tempPath, content, "utf-8");
  await fs.rename(tempPath, POSTS_JSON_PATH);
}

function markdownPathBySlug(slug) {
  return path.join(POSTS_DIR, `${slug}.md`);
}

async function readMarkdownBySlug(slug) {
  const target = markdownPathBySlug(slug);
  try {
    return await fs.readFile(target, "utf-8");
  } catch (err) {
    if (err && typeof err === "object" && err.code === "ENOENT") return "";
    throw err;
  }
}

async function writeMarkdownBySlug(slug, markdown) {
  await fs.mkdir(POSTS_DIR, { recursive: true });
  await fs.writeFile(markdownPathBySlug(slug), `${markdown.trim()}\n`, "utf-8");
}

async function deleteMarkdownBySlug(slug) {
  try {
    await fs.unlink(markdownPathBySlug(slug));
  } catch (err) {
    if (err && typeof err === "object" && err.code === "ENOENT") return;
    throw err;
  }
}

async function readJsonFile(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err && typeof err === "object" && err.code === "ENOENT") {
      return fallbackValue;
    }
    throw err;
  }
}

async function writeJsonFileAtomic(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  await fs.rename(tempPath, filePath);
}

function normalizeOperationItem(item) {
  if (!item || typeof item !== "object") return null;
  const id = String(item.id || "").trim();
  const type = String(item.type || "").trim();
  const slug = String(item.slug || "").trim();
  const detail = String(item.detail || "").trim();
  const at = String(item.at || "").trim();
  const username = String(item.username || "").trim();
  if (!id || !type || !at) return null;
  return { id, type, slug, detail, at, username };
}

function sanitizeOperations(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(normalizeOperationItem)
    .filter(Boolean)
    .slice(0, Math.max(10, ADMIN_OPERATION_LOG_LIMIT));
}

function cleanupExpiredSessions() {
  let dirty = false;
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (!session || !session.expiresAt || session.expiresAt <= now) {
      sessions.delete(token);
      dirty = true;
    }
  }
  return dirty;
}

function persistSessionsInBackground() {
  void persistSessions().catch((err) => {
    console.error("[api] persist sessions failed:", err);
  });
}

async function persistSessions() {
  const serialized = Array.from(sessions.entries()).map(([token, session]) => ({
    token,
    username: session.username,
    expiresAt: session.expiresAt
  }));
  await writeJsonFileAtomic(SESSIONS_JSON_PATH, serialized);
}

async function persistOperations() {
  await writeJsonFileAtomic(OPERATIONS_JSON_PATH, operationLog);
}

async function loadAdminState() {
  await fs.mkdir(ADMIN_DATA_ROOT, { recursive: true });

  sessions.clear();
  const rawSessions = await readJsonFile(SESSIONS_JSON_PATH, []);
  if (Array.isArray(rawSessions)) {
    const now = Date.now();
    for (const item of rawSessions) {
      const token = String(item?.token || "").trim();
      const username = String(item?.username || "").trim();
      const expiresAt = Number(item?.expiresAt || 0);
      if (!token || !username || !Number.isFinite(expiresAt) || expiresAt <= now) continue;
      sessions.set(token, { username, expiresAt });
    }
  }

  const rawOperations = await readJsonFile(OPERATIONS_JSON_PATH, []);
  operationLog = sanitizeOperations(rawOperations);

  await persistSessions();
  await persistOperations();
}

function appendAdminOperation(type, slug, detail, username = "") {
  operationLog.unshift({
    id: `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    type: String(type || "").trim() || "操作",
    slug: String(slug || "").trim(),
    detail: String(detail || "").trim(),
    at: new Date().toLocaleString("zh-CN", { hour12: false }),
    username: String(username || "").trim()
  });
  operationLog = operationLog.slice(0, Math.max(10, ADMIN_OPERATION_LOG_LIMIT));
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, chunk) => {
      const index = chunk.indexOf("=");
      if (index < 0) return acc;
      const key = chunk.slice(0, index).trim();
      const value = chunk.slice(index + 1).trim();
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        acc[key] = value;
      }
      return acc;
    }, {});
}

function getSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[ADMIN_SESSION_COOKIE] || "";
}

function setSessionCookie(res, token, maxAgeMs) {
  const maxAgeSec = Math.max(0, Math.floor(maxAgeMs / 1000));
  const attributes = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAgeSec}`
  ];
  if (ADMIN_COOKIE_SECURE) {
    attributes.push("Secure");
  }
  res.setHeader("Set-Cookie", attributes.join("; "));
}

function clearSessionCookie(res) {
  const attributes = [
    `${ADMIN_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0"
  ];
  if (ADMIN_COOKIE_SECURE) {
    attributes.push("Secure");
  }
  res.setHeader("Set-Cookie", attributes.join("; "));
}

function getActiveSession(req) {
  if (cleanupExpiredSessions()) {
    persistSessionsInBackground();
  }
  const token = getSessionToken(req);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    persistSessionsInBackground();
    return null;
  }
  return { token, ...session };
}

function requireAdminSession(req, res, next) {
  const session = getActiveSession(req);
  if (!session) {
    res.status(401).json({ message: "请先登录管理后台。" });
    return;
  }
  session.expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  sessions.set(session.token, {
    username: session.username,
    expiresAt: session.expiresAt
  });
  persistSessionsInBackground();
  setSessionCookie(res, session.token, ADMIN_SESSION_TTL_MS);
  req.adminUser = session.username;
  next();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/posts", async (_req, res, next) => {
  try {
    const posts = await readPostsMeta();
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

app.get("/api/tags", async (_req, res, next) => {
  try {
    const posts = await readPostsMeta();
    res.json([...new Set(posts.map((post) => post.tag).filter(Boolean))]);
  } catch (err) {
    next(err);
  }
});

app.get("/api/posts/:slug/related", async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim();
    const posts = await readPostsMeta();
    const current = posts.find((post) => post.slug === slug);
    if (!current) {
      res.status(404).json({ message: "文章不存在。" });
      return;
    }

    const tag = String(req.query.tag || current.tag).trim();
    const parsedLimit = Number.parseInt(String(req.query.limit || "3"), 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 20) : 3;
    const related = posts.filter((post) => post.slug !== slug && post.tag === tag).slice(0, limit);
    res.json(related);
  } catch (err) {
    next(err);
  }
});

app.get("/api/posts/:slug/adjacent", async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim();
    const posts = await readPostsMeta();
    const index = posts.findIndex((post) => post.slug === slug);
    if (index < 0) {
      res.status(404).json({ message: "文章不存在。" });
      return;
    }
    res.json({
      previous: posts[index + 1] || null,
      next: posts[index - 1] || null
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/posts/:slug", async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!isValidSlug(slug)) {
      res.status(404).json({ message: "文章不存在。" });
      return;
    }

    const posts = await readPostsMeta();
    const target = posts.find((post) => post.slug === slug);
    if (!target) {
      res.status(404).json({ message: "文章不存在。" });
      return;
    }
    const markdown = await readMarkdownBySlug(slug);
    res.json({
      ...target,
      markdown
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/admin/session", (req, res) => {
  const session = getActiveSession(req);
  res.json({
    loggedIn: Boolean(session),
    username: session?.username || ""
  });
});

app.post("/api/admin/login", async (req, res, next) => {
  try {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      res.status(401).json({ message: "账号或密码错误。" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, {
      username,
      expiresAt: Date.now() + ADMIN_SESSION_TTL_MS
    });
    await persistSessions();
    appendAdminOperation("登录", "-", "登录后台", username);
    await persistOperations();

    setSessionCookie(res, token, ADMIN_SESSION_TTL_MS);
    res.json({
      loggedIn: true,
      username
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/admin/logout", async (req, res, next) => {
  try {
    const token = getSessionToken(req);
    const session = token ? sessions.get(token) : null;
    if (token) {
      sessions.delete(token);
      await persistSessions();
    }
    if (session?.username) {
      appendAdminOperation("退出", "-", "退出后台", session.username);
      await persistOperations();
    }
    clearSessionCookie(res);
    res.json({
      loggedIn: false
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/admin/posts", requireAdminSession, async (_req, res, next) => {
  try {
    const metaPosts = await readPostsMeta();
    const fullPosts = await Promise.all(
      metaPosts.map(async (post) => ({
        ...post,
        markdown: await readMarkdownBySlug(post.slug)
      }))
    );
    res.json(fullPosts);
  } catch (err) {
    next(err);
  }
});

app.get("/api/admin/operations", requireAdminSession, (_req, res) => {
  res.json(operationLog.slice(0, 100));
});

app.put("/api/admin/posts/:slug", requireAdminSession, async (req, res, next) => {
  try {
    const slugFromPath = String(req.params.slug || "").trim();
    const post = normalizePost(req.body || {});

    if (slugFromPath !== post.slug) {
      res.status(400).json({ message: "请求路径与文章 slug 不一致。" });
      return;
    }

    const validationError = validatePost(post);
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    const metaPosts = await readPostsMeta();
    const index = metaPosts.findIndex((item) => item.slug === post.slug);
    const isUpdate = index >= 0;
    const nextMeta = {
      slug: post.slug,
      title: post.title,
      tag: post.tag,
      date: post.date,
      excerpt: post.excerpt,
      description: post.description,
      readingTime: post.readingTime
    };

    if (isUpdate) {
      metaPosts[index] = nextMeta;
    } else {
      metaPosts.push(nextMeta);
    }

    await writePostsMeta(metaPosts);
    await writeMarkdownBySlug(post.slug, post.markdown);
    appendAdminOperation("保存", post.slug, isUpdate ? "更新文章" : "新建文章", req.adminUser);
    await persistOperations();
    res.json(post);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/admin/posts/:slug", requireAdminSession, async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!isValidSlug(slug)) {
      res.status(400).json({ message: "非法 slug。" });
      return;
    }

    const metaPosts = await readPostsMeta();
    const index = metaPosts.findIndex((item) => item.slug === slug);
    if (index < 0) {
      res.status(404).json({ message: "文章不存在。" });
      return;
    }

    metaPosts.splice(index, 1);
    await writePostsMeta(metaPosts);
    await deleteMarkdownBySlug(slug);
    appendAdminOperation("删除", slug, "文章已删除", req.adminUser);
    await persistOperations();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ message: "请求体 JSON 格式错误。" });
    return;
  }
  console.error("[api] error:", err);
  res.status(500).json({ message: "服务器内部错误。" });
});

async function startServer() {
  await loadAdminState();

  app.listen(API_PORT, () => {
    if (USING_GENERATED_ADMIN_PASSWORD) {
      console.warn("[api] ADMIN_PASSWORD 未配置，已生成一次性强密码（重启会变化）：");
      console.warn(`[api] ADMIN_PASSWORD=${ADMIN_PASSWORD}`);
      console.warn("[api] 请在 .env 中设置固定强密码，避免每次重启都变更。");
    }
    console.log(`[api] content root: ${CONTENT_ROOT}`);
    console.log(`[api] admin data root: ${ADMIN_DATA_ROOT}`);
    console.log(`[api] listening on http://127.0.0.1:${API_PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[api] failed to start:", err);
  process.exit(1);
});
