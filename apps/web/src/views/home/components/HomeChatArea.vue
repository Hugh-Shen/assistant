<script setup lang="ts">
import { Bot, FileText, Globe } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import HomeChatComposer from "./HomeChatComposer.vue"
import HomeMessageContentJson from "./HomeMessageContentJson.vue"
import HomeMessageContentStream from "./HomeMessageContentStream.vue"

export interface ChatMessage {
  role: "assistant" | "user"
  content: string
  displayContent?: string
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
          class="flex"
          :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div v-if="message.role === 'assistant'" class="flex max-w-[min(760px,100%)] items-start gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900"
            >
              <Bot class="size-5" />
            </div>

            <div
              class="max-w-[min(720px,100%)] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm"
              :class="message.pending
                ? 'border border-slate-200/80 bg-white/95 text-slate-700 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200'
                : 'border border-slate-200/80 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200'"
            >
              <HomeMessageContentStream
                v-if="props.responseMode === 'stream' && message.pending"
                :message="message"
              />
              <HomeMessageContentJson
                v-else
                :message="message"
              />
            </div>
          </div>

          <div v-else class="flex max-w-[min(760px,100%)] items-end gap-3">
            <div
              class="max-w-[min(720px,100%)] rounded-2xl bg-slate-900 px-4 py-3 text-sm leading-6 text-white shadow-sm dark:bg-white dark:text-slate-900"
            >
              <div class="whitespace-pre-wrap break-words">
                {{ message.content }}
              </div>
            </div>

            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              A
            </div>
          </div>
        </article>
      </div>

      <HomeChatComposer
        :is-asking="props.isAsking"
        @send="emit('send', $event)"
        @stop="emit('stop')"
      />
    </div>
  </section>
</template>
