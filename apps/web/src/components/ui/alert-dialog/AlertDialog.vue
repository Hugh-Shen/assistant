<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
}>()

const emit = defineEmits<{
  "update:open": [open: boolean]
  confirm: []
  cancel: []
}>()

function close() {
  emit("update:open", false)
  emit("cancel")
}

function confirm() {
  emit("confirm")
  emit("update:open", false)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm"
      @click.self="close"
    >
      <div class="w-full max-w-md rounded-3xl border border-white/10 bg-white p-6 shadow-2xl dark:bg-slate-950">
        <div>
          <p class="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {{ props.title }}
          </p>
          <p
            v-if="props.description"
            class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300"
          >
            {{ props.description }}
          </p>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-900"
            @click="close"
          >
            {{ props.cancelText || "取消" }}
          </button>
          <button
            class="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
            @click="confirm"
          >
            {{ props.confirmText || "确认" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
