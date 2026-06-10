<script setup lang="ts">
import type { ChatMessage } from "./HomeChatArea.vue"

const props = defineProps<{
  message: ChatMessage
}>()

function getStreamingContent(message: ChatMessage) {
  return message.displayContent ?? ""
}
</script>

<template>
  <div class="whitespace-pre-wrap break-words">
    {{ getStreamingContent(props.message) }}
  </div>
</template>
