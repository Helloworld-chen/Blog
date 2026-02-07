function escapeHtml(input) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripInlineMarkdown(input) {
  return String(input || "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function slugifyHeading(text) {
  return stripInlineMarkdown(text)
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function createHeadingId(rawText, cache) {
  const base = slugifyHeading(rawText) || "section";
  const count = cache.get(base) || 0;
  cache.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function sanitizeUrl(url) {
  const value = url.trim();
  if (/^(https?:|mailto:|\/|#)/i.test(value)) return value;
  return "#";
}

function renderInline(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safeUrl = sanitizeUrl(url);
    const external = /^https?:/i.test(safeUrl) ? ' target="_blank" rel="noreferrer"' : "";
    return `<a href="${safeUrl}"${external}>${label}</a>`;
  });
  return html;
}

export function extractHeadings(markdown = "") {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const result = [];
  const headingIdCache = new Map();
  let inCode = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      const text = stripInlineMarkdown(trimmed.slice(3));
      if (!text) continue;
      result.push({ level: 2, text, id: createHeadingId(text, headingIdCache) });
      continue;
    }
    if (trimmed.startsWith("### ")) {
      const text = stripInlineMarkdown(trimmed.slice(4));
      if (!text) continue;
      result.push({ level: 3, text, id: createHeadingId(text, headingIdCache) });
    }
  }

  return result;
}

export function markdownToHtml(markdown = "") {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  const headingIdCache = new Map();

  let inList = false;
  let inCode = false;
  let codeBuffer = [];

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  const closeCodeBlock = () => {
    if (inCode) {
      html.push(`<pre><code>${codeBuffer.join("\n")}</code></pre>`);
      codeBuffer = [];
      inCode = false;
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      closeList();
      if (inCode) {
        closeCodeBlock();
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(escapeHtml(line));
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${renderInline(trimmed.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    closeList();

    if (trimmed.startsWith("### ")) {
      const headingText = trimmed.slice(4);
      const headingId = createHeadingId(headingText, headingIdCache);
      html.push(`<h3 id="${headingId}">${renderInline(headingText)}</h3>`);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      const headingText = trimmed.slice(3);
      const headingId = createHeadingId(headingText, headingIdCache);
      html.push(`<h2 id="${headingId}">${renderInline(headingText)}</h2>`);
      continue;
    }

    if (trimmed.startsWith("# ")) {
      html.push(`<h1>${renderInline(trimmed.slice(2))}</h1>`);
      continue;
    }

    if (trimmed.startsWith("> ")) {
      html.push(`<blockquote>${renderInline(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    html.push(`<p>${renderInline(trimmed)}</p>`);
  }

  closeList();
  closeCodeBlock();

  return html.join("\n");
}
