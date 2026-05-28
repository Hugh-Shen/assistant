<script setup lang="ts">
import { ArrowUp, Bot, FileText, Globe, Image, Lightbulb, Upload } from "@lucide/vue"
import { Button } from "@/components/ui/button"

export interface ChatMessage {
  role: "assistant" | "user"
  content: string
}

export interface ChatStat {
  label: string
  value: string
}

defineProps<{
  messages: ChatMessage[]
  stats: ChatStat[]
}>()
</script>

<template>
  <section class="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
    <div class="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
      <div>
        <p class="text-sm font-semibold">GPT-like Home</p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">对话式首页骨架，方便继续接入真实数据</p>
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
          <p class="mt-1 text-lg font-semibold">{{ stat.value }}</p>
        </div>
      </div>

      <div class="mt-6 flex-1 space-y-4">
        <article
          v-for="message in messages"
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
              : 'border border-slate-200/80 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200'"
          >
            {{ message.content }}
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
            rows="4"
            placeholder="给我一个页面需求，或者直接描述你想要的 GPT 风格首页。"
            class="min-h-[120px] w-full resize-none rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-white/10 dark:bg-slate-950/60 dark:focus:border-slate-500 dark:focus:bg-slate-950"
          />
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Enter 发送，Shift + Enter 换行
          </p>
          <Button class="rounded-xl">
            发送消息
            <ArrowUp class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </section>
</template>
