<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: "确认"
  },
  cancelText: {
    type: String,
    default: "取消"
  },
  danger: {
    type: Boolean,
    default: false
  },
  busy: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["update:open", "confirm", "cancel"]);

const dialogRef = ref(null);
const cancelRef = ref(null);

function requestClose() {
  if (props.busy) return;
  emit("update:open", false);
  emit("cancel");
}

function requestConfirm() {
  if (props.busy) return;
  emit("confirm");
}

function handleDialogCancel(event) {
  // Prevent Esc from closing the dialog.
  event.preventDefault();
}

function handleDialogClose() {
  // Keep v-model in sync if the dialog ever closes (even programmatically).
  emit("update:open", false);
}

watch(
  () => props.open,
  async (shouldOpen) => {
    const dialog = dialogRef.value;
    if (!dialog) return;

    if (shouldOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      await nextTick();
      cancelRef.value?.focus();
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  },
  { immediate: true }
);

onMounted(() => {
  dialogRef.value?.addEventListener("cancel", handleDialogCancel);
});

onBeforeUnmount(() => {
  dialogRef.value?.removeEventListener("cancel", handleDialogCancel);
  if (dialogRef.value?.open) {
    dialogRef.value.close();
  }
});
</script>

<template>
  <dialog
    ref="dialogRef"
    class="confirm-dialog"
    aria-modal="true"
    :aria-labelledby="'confirmTitle'"
    :aria-describedby="'confirmMessage'"
    @close="handleDialogClose"
  >
    <div class="confirm-dialog-body">
      <h2 id="confirmTitle" class="confirm-dialog-title">{{ title }}</h2>
      <p id="confirmMessage" class="confirm-dialog-message">{{ message }}</p>
      <div class="confirm-dialog-actions">
        <button ref="cancelRef" class="btn ghost" type="button" :disabled="busy" @click="requestClose">
          {{ cancelText }}
        </button>
        <button class="btn" :class="{ danger }" type="button" :disabled="busy" @click="requestConfirm">
          {{ busy ? "处理中..." : confirmText }}
        </button>
      </div>
    </div>
  </dialog>
</template>

