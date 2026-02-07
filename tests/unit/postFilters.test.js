import { describe, expect, it } from "vitest";

import {
  filterPosts,
  getSuggestions,
  paginatePosts,
  sortByDateDesc,
  sortPosts
} from "../../src/utils/postFilters.js";

const fixtures = [
  {
    slug: "a",
    title: "前端性能预算",
    excerpt: "优化要有边界",
    tag: "前端",
    date: "2026-01-03",
    readingTime: 7
  },
  {
    slug: "b",
    title: "设计系统语义",
    excerpt: "先定义语言",
    tag: "设计",
    date: "2026-01-08",
    readingTime: 4
  },
  {
    slug: "c",
    title: "工程质量守门",
    excerpt: "流程优先",
    tag: "工程",
    date: "2025-12-20",
    readingTime: 10
  }
];

describe("sortByDateDesc", () => {
  it("sorts posts by date descending", () => {
    const list = sortByDateDesc(fixtures);
    expect(list.map((post) => post.slug)).toEqual(["b", "a", "c"]);
  });
});

describe("filterPosts", () => {
  it("filters by tag", () => {
    const list = filterPosts(fixtures, { tag: "前端", keyword: "" });
    expect(list).toHaveLength(1);
    expect(list[0].slug).toBe("a");
  });

  it("filters by keyword", () => {
    const list = filterPosts(fixtures, { tag: "all", keyword: "语义" });
    expect(list).toHaveLength(1);
    expect(list[0].slug).toBe("b");
  });

  it("filters by tag and keyword together", () => {
    const list = filterPosts(fixtures, { tag: "工程", keyword: "流程" });
    expect(list).toHaveLength(1);
    expect(list[0].slug).toBe("c");
  });
});

describe("getSuggestions", () => {
  it("returns max 6 suggestions", () => {
    const list = getSuggestions(fixtures, { tag: "all", keyword: "" }, 2);
    expect(list).toHaveLength(2);
  });
});

describe("sortPosts", () => {
  it("sorts by reading time ascending", () => {
    const list = sortPosts(fixtures, "read_asc");
    expect(list.map((post) => post.slug)).toEqual(["b", "a", "c"]);
  });

  it("sorts by reading time descending", () => {
    const list = sortPosts(fixtures, "read_desc");
    expect(list.map((post) => post.slug)).toEqual(["c", "a", "b"]);
  });
});

describe("paginatePosts", () => {
  it("returns items based on page and page size", () => {
    const list = paginatePosts(fixtures, 1, 2);
    expect(list).toHaveLength(2);
    expect(list.map((post) => post.slug)).toEqual(["a", "b"]);
  });
});
