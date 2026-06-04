<script setup lang="ts">
import type { ChatConversation, ChatMessageRecord } from "@assistant/shared"
import { onMounted, ref } from "vue"
import {
  askRagQuestion,
  createConversation,
  getConversationMessages,
  listConversations,
} from "@/api/chat"
import {
  type ChatMessage,
  type ChatStat,
  type ConversationItem,
  HomeChatArea,
  HomeContextPanel,
  HomeSidebar,
  HomeTopbar,
} from "./components"

const conversations = ref<ConversationItem[]>([])
const activeConversationId = ref<string>()
const activeConversationTitle = ref("")
const isAsking = ref(false)

const quickPrompts = [
  "帮我把这个页面改成更像 GPT 的布局",
  "给我一个组件拆分建议",
  "把输入框做成多行聊天框",
  "补充暗色模式视觉层次",
]

const messages = ref<ChatMessage[]>([
  {
    role: "assistant",
    content:
      "我已经接入了后端 RAG 问答链路。你现在可以直接提问，我会先召回文档，再结合上下文回答。",
  },
])

const stats: ChatStat[] = [
  { label: "上下文窗口", value: "32k" },
  { label: "响应模式", value: "RAG" },
  { label: "当前模型", value: "OpenAI" },
]

function toUiMessages(records: ChatMessageRecord[]): ChatMessage[] {
  return records.map(record => ({
    role: record.role,
    content: record.content,
  }))
}

async function loadConversations() {
  const data = await listConversations()
  conversations.value = data.conversations.map(conversation => ({
    id: conversation.id,
    title: conversation.title,
    preview: "点击查看历史消息",
  } satisfies ConversationItem))

  if (!activeConversationId.value && data.conversations[0]) {
    await selectConversation(data.conversations[0].id)
  }
}

async function createNewConversation() {
  const data = await createConversation("新会话")
  activeConversationId.value = data.conversation.id
  activeConversationTitle.value = data.conversation.title
  messages.value = [
    {
      role: "assistant",
      content: "新会话已创建，你可以开始提问了。",
    },
  ]
  await loadConversations()
}

async function selectConversation(conversationId: string) {
  const data = await getConversationMessages(conversationId)
  activeConversationId.value = data.conversation.id
  activeConversationTitle.value = data.conversation.title
  messages.value = data.messages.length
    ? toUiMessages(data.messages)
    : [
        {
          role: "assistant",
          content: "这个会话还没有消息，直接开始提问即可。",
        },
      ]
}

async function askQuestion(question: string) {
  if (isAsking.value) {
    return
  }

  isAsking.value = true

  if (!activeConversationId.value) {
    await createNewConversation()
  }

  messages.value.push({
    role: "user",
    content: question,
  })

  try {
    const payload = await askRagQuestion({
      question,
      conversationId: activeConversationId.value,
    })

    messages.value.push({
      role: "assistant",
      content: payload.answer,
      citations: payload.citations,
    })

    await loadConversations()
  } catch (error) {
    messages.value.push({
      role: "assistant",
      content:
        error instanceof Error
          ? `请求失败：${error.message}`
          : "请求失败，请稍后再试。",
    })
  } finally {
    isAsking.value = false
  }
}

onMounted(async () => {
  await loadConversations()
})
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_35%),linear-gradient(to_bottom_right,_#fafafa,_#f3f4f6)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_35%),linear-gradient(to_bottom_right,_#09090b,_#111827)] dark:text-slate-50">
    <div class="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 lg:px-6">
      <HomeTopbar />

      <main class="grid flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <HomeSidebar
          :conversations="conversations"
          :quick-prompts="quickPrompts"
          :active-conversation-id="activeConversationId"
          @select="selectConversation"
          @create="createNewConversation"
          @prompt="askQuestion"
        />

        <HomeChatArea
          :messages="messages"
          :stats="stats"
          :conversation-title="activeConversationTitle"
          :is-asking="isAsking"
          @send="askQuestion"
        />

        <HomeContextPanel />
      </main>
    </div>
  </div>
</template>
