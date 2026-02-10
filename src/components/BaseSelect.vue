<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true
  },
  options: {
    type: Array,
    required: true
    // [{ value: string|number, label: string }]
  },
  ariaLabel: {
    type: String,
    default: ""
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["update:modelValue"]);

const rootRef = ref(null);
const triggerRef = ref(null);
const listboxRef = ref(null);

const isOpen = ref(false);
const activeIndex = ref(-1);

const selectedIndex = computed(() =>
  props.options.findIndex((opt) => opt?.value === props.modelValue)
);
const selectedLabel = computed(() => props.options[selectedIndex.value]?.label ?? "");
const listboxLabel = computed(() => props.ariaLabel || selectedLabel.value || "下拉菜单");

function close() {
  isOpen.value = false;
  activeIndex.value = -1;
}

function open() {
  if (props.disabled) return;
  isOpen.value = true;
  activeIndex.value = Math.max(0, selectedIndex.value);
}

function toggle() {
  if (isOpen.value) close();
  else open();
}

function setActive(nextIndex) {
  const max = props.options.length - 1;
  if (max < 0) return;
  const clamped = Math.min(max, Math.max(0, nextIndex));
  activeIndex.value = clamped;
}

function commitActive() {
  const opt = props.options[activeIndex.value];
  if (!opt) return;
  emit("update:modelValue", opt.value);
  close();
  nextTick(() => triggerRef.value?.focus());
}

function ensureActiveVisible() {
  const root = listboxRef.value;
  if (!root) return;
  const active = root.querySelector('[data-active="true"]');
  if (!active) return;
  active.scrollIntoView({ block: "nearest" });
}

function choose(index) {
  setActive(index);
  commitActive();
}

function handleTriggerKeydown(event) {
  if (props.disabled) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    open();
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    toggle();
  }
}

function handleListboxKeydown(event) {
  if (!isOpen.value) return;

  if (event.key === "Escape") {
    event.preventDefault();
    close();
    nextTick(() => triggerRef.value?.focus());
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    setActive(activeIndex.value + 1);
    nextTick(ensureActiveVisible);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    setActive(activeIndex.value - 1);
    nextTick(ensureActiveVisible);
    return;
  }

  if (event.key === "Home") {
    event.preventDefault();
    setActive(0);
    nextTick(ensureActiveVisible);
    return;
  }

  if (event.key === "End") {
    event.preventDefault();
    setActive(props.options.length - 1);
    nextTick(ensureActiveVisible);
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    commitActive();
  }
}

function handleOutsidePointerDown(event) {
  const root = rootRef.value;
  if (!root) return;
  if (root.contains(event.target)) return;
  close();
}

watch(isOpen, async (openNow) => {
  if (!openNow) return;
  await nextTick();
  listboxRef.value?.focus();
  ensureActiveVisible();
});

onMounted(() => {
  document.addEventListener("pointerdown", handleOutsidePointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleOutsidePointerDown);
});
</script>

<template>
  <div ref="rootRef" class="select" :class="{ open: isOpen, disabled }">
    <button
      ref="triggerRef"
      class="select-trigger"
      type="button"
      :disabled="disabled"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown="handleTriggerKeydown"
    >
      <span class="select-trigger-label">{{ selectedLabel }}</span>
      <span class="select-trigger-caret" aria-hidden="true">▾</span>
    </button>

    <div
      v-if="isOpen"
      ref="listboxRef"
      class="select-popover"
      role="listbox"
      tabindex="0"
      :aria-label="listboxLabel"
      @keydown="handleListboxKeydown"
    >
      <button
        v-for="(opt, index) in options"
        :key="String(opt.value)"
        class="select-option"
        type="button"
        role="option"
        :aria-selected="opt.value === modelValue ? 'true' : 'false'"
        :data-active="index === activeIndex ? 'true' : 'false'"
        @mousemove="setActive(index)"
        @click="choose(index)"
      >
        <span class="select-option-label">{{ opt.label }}</span>
        <span v-if="opt.value === modelValue" class="select-option-check" aria-hidden="true">✓</span>
      </button>
    </div>
  </div>
</template>
