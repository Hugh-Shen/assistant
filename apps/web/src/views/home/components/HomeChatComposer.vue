<script setup lang="ts">
import { computed, ref } from "vue"
import { ArrowUp, Image, Lightbulb, Upload } from "@lucide/vue"
import { Button } from "@/components/ui/button"

const props = defineProps<{
  isAsking?: boolean
}>()

const emit = defineEmits<{
  send: [question: string]
  stop: []
}>()

const prompt = ref("")
const canSend = computed(() => prompt.value.trim().length > 0 && !props.isAsking)

async function onSend() {
  const value = prompt.value.trim()

  if (!value || props.isAsking) {
    return
  }

  emit("send", value)
  prompt.value = ""
}
</script>

<template>
  <div class="mt-6 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
    <div class="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" class="rounded-xl">
        <Image class="size-4" />
        图片
      </Button>
      <Button variant="outline" size="sm" class="rounded-xl">
        <Upload class="size-4" />
        上传
      </Button>
      <Button variant="outline" size="sm" class="rounded-xl">
        <Lightbulb class="size-4" />
        提示词
      </Button>
    </div>

    <div class="mt-4">
      <label class="sr-only" for="prompt">输入消息</label>
      <textarea
        id="prompt"
        v-model="prompt"
        rows="4"
        placeholder="输入你的问题，我会基于已解析文档做召回回答。"
        class="min-h-[120px] w-full resize-none rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-white/10 dark:bg-slate-950/60 dark:focus:border-slate-500 dark:focus:bg-slate-950"
        @keydown.enter.exact.prevent="onSend"
      />
    </div>

    <div class="mt-4 flex items-center justify-between gap-3">
      <p class="text-xs text-slate-500 dark:text-slate-400">
        Enter 发送，Shift + Enter 换行
      </p>
      <Button
        class="rounded-xl"
        :disabled="props.isAsking ? false : !canSend"
        @click="props.isAsking ? emit('stop') : onSend()"
      >
        {{ props.isAsking ? "中断生成" : "发送消息" }}
        <ArrowUp class="size-4" />
      </Button>
    </div>
  </div>
</template>
