<script setup lang="ts">
import type { ChatMessage } from "./HomeChatArea.vue"

const props = defineProps<{
  message: ChatMessage
}>()

function toParagraphs(content: string) {
  return content.split(/\n{2,}/).filter(Boolean)
}
</script>

<template>
  <div
    v-if="props.message.pending"
    class="whitespace-pre-wrap break-words"
  >
    {{ props.message.content }}
  </div>
  <div v-else class="space-y-3 break-words">
    <p
      v-for="(paragraph, index) in toParagraphs(props.message.content)"
      :key="`${paragraph.slice(0, 24)}-${index}`"
      class="chat-paragraph whitespace-pre-wrap"
      :style="{ animationDelay: `${index * 80}ms` }"
    >
      {{ paragraph }}
    </p>
  </div>

  <div
    v-if="props.message.pending"
    class="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
  >
    <span class="inline-flex size-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500" />
    正在生成中
  </div>

  <div
    v-if="!props.message.pending && props.message.citations?.length"
    class="mt-3 space-y-2 border-t border-slate-200/80 pt-3 text-xs dark:border-white/10"
  >
    <div
      v-for="(citation, index) in props.message.citations"
      :key="citation.chunkId || citation.url || citation.title || citation.text.slice(0, 24)"
      class="chat-citation rounded-xl bg-slate-50 px-3 py-2 text-slate-600 dark:bg-slate-950/60 dark:text-slate-300"
      :style="{ animationDelay: `${60 + index * 70}ms` }"
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
</template>

<style scoped>
.chat-paragraph {
  animation: paragraph-slide-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.chat-citation {
  animation: citation-stagger-in 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes paragraph-slide-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes citation-stagger-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
