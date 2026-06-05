<script setup lang="ts">
import { computed, ref } from "vue"
import { ArrowUp, Bot, FileText, Globe, Image, Lightbulb, Upload } from "@lucide/vue"
import { Button } from "@/components/ui/button"

export interface ChatMessage {
  role: "assistant" | "user"
  content: string
  pending?: boolean
  citations?: Array<{
    sourceType: "knowledge_base" | "web"
    source?: string
    title?: string
    url?: string
    documentId?: string
    chunkId?: string
    score: number
    text: string
  }>
}

export interface ChatStat {
  label: string
  value: string
}

export type ResponseModeOption = "stream" | "json"

const props = defineProps<{
  messages: ChatMessage[]
  stats: ChatStat[]
  conversationTitle?: string
  isAsking?: boolean
  retrievalModeLabel?: string
  responseMode?: ResponseModeOption
  canSwitchResponseMode?: boolean
}>()

const emit = defineEmits<{
  send: [question: string]
  stop: []
  changeResponseMode: [mode: ResponseModeOption]
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
  <section class="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
    <div class="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
      <div>
        <p class="text-sm font-semibold">GPT-like Home</p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ props.conversationTitle || "对话式知识问答" }}</p>
      </div>

      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" class="rounded-xl">
          <Globe class="size-4" />
          Web
        </Button>
        <Button variant="outline" size="sm" class="rounded-xl">
          <FileText class="size-4" />
          文档
        </Button>
      </div>
    </div>

    <div class="flex flex-1 flex-col overflow-hidden px-5 py-6">
      <div class="flex flex-wrap gap-3">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-900/60"
        >
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ stat.label }}</p>
          <button
            v-if="stat.label === '响应模式'"
            class="mt-2 inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-slate-900 cursor-pointer"
            :disabled="!props.canSwitchResponseMode"
            @click="emit('changeResponseMode', props.responseMode === 'stream' ? 'json' : 'stream')"
          >
            {{ props.responseMode === 'stream' ? 'Streaming' : 'Blocking' }}
          </button>
          <p v-else class="mt-1 text-lg font-semibold">
            {{ stat.value }}
          </p>
        </div>
      </div>

      <div class="mt-6 flex-1 space-y-4">
        <article
          v-for="message in props.messages"
          :key="`${message.role}-${message.content.slice(0, 24)}`"
          class="flex gap-3"
          :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            v-if="message.role === 'assistant'"
            class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900"
          >
            <Bot class="size-5" />
          </div>

          <div
            class="max-w-[min(720px,100%)] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm"
            :class="message.role === 'user'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : message.pending
                ? 'border border-sky-200 bg-sky-50 text-slate-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-slate-100'
                : 'border border-slate-200/80 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200'"
          >
            {{ message.content }}

            <div
              v-if="message.pending"
              class="mt-3 flex items-center gap-2 text-xs text-sky-600 dark:text-sky-300"
            >
              <span class="inline-flex size-2 animate-pulse rounded-full bg-sky-500" />
              正在生成中
            </div>

            <div
              v-if="!message.pending && message.citations?.length"
              class="mt-3 space-y-2 border-t border-slate-200/80 pt-3 text-xs dark:border-white/10"
            >
              <div
                v-for="citation in message.citations"
                :key="citation.chunkId || citation.url || citation.title || citation.text.slice(0, 24)"
                class="rounded-xl bg-slate-50 px-3 py-2 text-slate-600 dark:bg-slate-950/60 dark:text-slate-300"
              >
                <p class="font-medium">
                  {{ citation.sourceType === "web" ? "Web" : "KB" }}
                  / {{ citation.title || citation.documentId || "untitled" }}
                  / score {{ citation.score.toFixed(3) }}
                </p>
                <p v-if="citation.url" class="mt-1 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {{ citation.url }}
                </p>
                <p class="mt-1 line-clamp-3">{{ citation.text }}</p>
              </div>
            </div>
          </div>

          <div
            v-if="message.role === 'user'"
            class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            A
          </div>
        </article>
      </div>

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
    </div>
  </section>
</template>
