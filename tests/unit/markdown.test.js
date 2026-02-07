import { describe, expect, it } from "vitest";

import { extractHeadings, markdownToHtml } from "../../src/services/markdown.js";

describe("markdownToHtml", () => {
  it("renders headings and paragraphs", () => {
    const html = markdownToHtml("# 标题\n\n正文");
    expect(html).toContain("<h1>标题</h1>");
    expect(html).toContain("<p>正文</p>");
  });

  it("escapes dangerous html", () => {
    const html = markdownToHtml("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("renders list items", () => {
    const html = markdownToHtml("- a\n- b");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>a</li>");
    expect(html).toContain("<li>b</li>");
  });

  it("renders id on h2 headings for toc anchors", () => {
    const html = markdownToHtml("## 目录标题");
    expect(html).toContain('<h2 id="目录标题">目录标题</h2>');
  });
});

describe("extractHeadings", () => {
  it("extracts h2 and h3 headings", () => {
    const headings = extractHeadings("# 标题\n## 第一节\n### 子节");
    expect(headings).toEqual([
      { level: 2, text: "第一节", id: "第一节" },
      { level: 3, text: "子节", id: "子节" }
    ]);
  });
});
