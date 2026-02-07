import { onMounted, onUnmounted } from "vue";

const sequence = "lxy";

export function useHomeEasterEgg() {
  let progress = 0;
  let timer = 0;
  let busy = false;
  let layer = null;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const duration = reducedMotion.matches ? 900 : 1600;

  const getLayer = () => {
    if (layer) return layer;

    layer = document.createElement("div");
    layer.id = "newYearEgg";
    layer.className = "new-year-egg";
    layer.setAttribute("aria-live", "polite");
    layer.setAttribute("aria-atomic", "true");
    layer.setAttribute("role", "status");
    layer.innerHTML = `
      <div class="burst burst-a"></div>
      <div class="burst burst-b"></div>
      <div class="burst burst-c"></div>
      <p class="new-year-egg-text">新年快乐</p>
    `;

    document.body.appendChild(layer);
    return layer;
  };

  const showEasterEgg = () => {
    if (busy) return;

    const node = getLayer();
    busy = true;
    node.classList.remove("visible");
    void node.offsetWidth;
    node.classList.add("visible");

    clearTimeout(timer);
    timer = window.setTimeout(() => {
      node.classList.remove("visible");
      busy = false;
    }, duration);
  };

  const normalizeKey = (event) => {
    if (/^[a-z]$/i.test(event.key)) {
      return event.key.toLowerCase();
    }

    if (/^Key[A-Z]$/.test(event.code)) {
      return event.code.slice(3).toLowerCase();
    }

    return "";
  };

  const handleKeydown = (event) => {
    const key = normalizeKey(event);
    if (!key) {
      progress = 0;
      return;
    }

    if (key === sequence[progress]) {
      progress += 1;
    } else {
      progress = key === sequence[0] ? 1 : 0;
    }

    if (progress === sequence.length) {
      progress = 0;
      showEasterEgg();
    }
  };

  onMounted(() => {
    document.addEventListener("keydown", handleKeydown);
  });

  onUnmounted(() => {
    document.removeEventListener("keydown", handleKeydown);
    clearTimeout(timer);
  });
}
