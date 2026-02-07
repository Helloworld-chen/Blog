import { watchEffect } from "vue";

const defaultTitle = "Nebula Notes";
const defaultDescription = "Nebula Notes 博客前端示例";

function getOrCreateMeta(name, attr = "name") {
  let node = document.head.querySelector(`meta[${attr}='${name}']`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attr, name);
    document.head.appendChild(node);
  }
  return node;
}

function resolveMeta(metaInput) {
  return typeof metaInput === "function" ? metaInput() : metaInput;
}

export function usePageMeta(metaInput) {
  watchEffect(() => {
    const meta = resolveMeta(metaInput) ?? {};
    const title = meta.title || defaultTitle;
    const description = meta.description || defaultDescription;

    document.title = title;

    getOrCreateMeta("description").setAttribute("content", description);
    getOrCreateMeta("og:title", "property").setAttribute("content", title);
    getOrCreateMeta("og:description", "property").setAttribute("content", description);
    getOrCreateMeta("og:type", "property").setAttribute("content", "website");
  });
}
