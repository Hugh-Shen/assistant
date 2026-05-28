<script setup lang="ts">
import { Lightbulb, SquarePen } from "@lucide/vue"
import { Button } from "@/components/ui/button"

export interface ConversationItem {
  title: string
  preview: string
}

defineProps<{
  conversations: ConversationItem[]
  quickPrompts: string[]
}>()
</script>

<template>
  <aside class="hidden flex-col gap-4 lg:flex">
    <section class="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold">Chats</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">最近会话</p>
        </div>
        <Button variant="ghost" size="icon-sm" class="rounded-xl">
          <SquarePen class="size-4" />
        </Button>
      </div>

      <div class="mt-4 space-y-2">
        <button
          v-for="conversation in conversations"
          :key="conversation.title"
          class="w-full rounded-xl border border-transparent bg-slate-50 px-3 py-3 text-left transition hover:border-slate-200 hover:bg-white dark:bg-slate-900/60 dark:hover:border-white/10 dark:hover:bg-slate-900"
        >
          <p class="text-sm font-medium">{{ conversation.title }}</p>
          <p class="mt-1 max-h-10 overflow-hidden text-xs leading-5 text-slate-500 dark:text-slate-400">
            {{ conversation.preview }}
          </p>
        </button>
      </div>
    </section>

    <section class="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <div class="flex items-center gap-2 text-sm font-semibold">
        <Lightbulb class="size-4 text-amber-500" />
        快速入口
      </div>

      <div class="mt-4 grid gap-2">
        <Button
          v-for="prompt in quickPrompts"
          :key="prompt"
          variant="outline"
          class="h-auto justify-start whitespace-normal rounded-xl border-slate-200/80 py-3 text-left font-normal dark:border-white/10"
        >
          {{ prompt }}
        </Button>
      </div>
    </section>
  </aside>
</template>
