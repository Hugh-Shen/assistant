<script setup lang="ts">
import { Lightbulb, SquarePen } from "@lucide/vue"
import { Button } from "@/components/ui/button"

export interface ConversationItem {
  id: string
  title: string
  preview: string
}

const props = defineProps<{
  conversations: ConversationItem[]
  quickPrompts: string[]
  activeConversationId?: string
}>()

const emit = defineEmits<{
  select: [conversationId: string]
  create: []
  prompt: [question: string]
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
        <Button variant="ghost" size="icon-sm" class="rounded-xl" @click="emit('create')">
          <SquarePen class="size-4" />
        </Button>
      </div>

      <div class="mt-4 space-y-2">
        <button
          v-for="conversation in props.conversations"
          :key="conversation.id"
          class="w-full rounded-xl border px-3 py-3 text-left transition dark:bg-slate-900/60 dark:hover:border-white/10 dark:hover:bg-slate-900"
          :class="conversation.id === props.activeConversationId
            ? 'border-slate-300 bg-white dark:border-white/20 dark:bg-slate-900'
            : 'border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white'"
          @click="emit('select', conversation.id)"
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
          @click="emit('prompt', prompt)"
        >
          {{ prompt }}
        </Button>
      </div>
    </section>
  </aside>
</template>
