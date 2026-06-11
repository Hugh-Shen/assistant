<script setup lang="ts">
import type {
  ChatMessageRecord,
  RagAnswerChunkEvent,
  RagAnswerCompletedEvent,
  RagAnswerStartedEvent,
  RagRetrievalMode,
} from "@assistant/shared"
import { computed, onMounted, ref } from "vue"
import {
  createConversation,
  deleteConversation,
  getConversationMessages,
  listConversations,
  askRagQuestion,
  updateConversationTitle,
} from "@/api/chat"
import { http } from "@/lib/http"
import { postSse } from "@/lib/sse"
import {
  type ChatMessage,
  type ResponseModeOption,
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
const activeRetrievalMode = ref<RagRetrievalMode>("knowledge_base")
const activeRoutingReason = ref("")
const askAbortController = ref<AbortController | null>(null)
const responseMode = ref<ResponseModeOption>("stream")
const streamingRenderTarget = ref<ChatMessage | null>(null)
const streamingCompleted = ref(false)
const streamingRenderCompletionResolver = ref<(() => void) | null>(null)
const streamingRevealProgress = {
  value: 0,
}
const STREAMING_CHARS_PER_SECOND = 42
let streamingAnimationFrameId: number | null = null
let streamingLastFrameTime: number | null = null

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

const retrievalModeLabel = computed(() => {
  switch (activeRetrievalMode.value) {
    case "knowledge_base":
      return "RAG"
    case "search":
      return "Search"
    case "hybrid":
      return "Hybrid"
    default:
      return "Unknown"
  }
})

function toUiMessages(records: ChatMessageRecord[]): ChatMessage[] {
  return records.map(record => ({
    role: record.role,
    content: record.content,
  }))
}

function buildConversationPreview(records: ChatMessageRecord[]) {
  const lastMessage = [...records].reverse().find(record => record.role === "user")
  return lastMessage?.content || "点击查看历史消息"
}

function syncDisplayedStreamingContent(target: ChatMessage) {
  const nextLength = Math.max(
    0,
    Math.min(target.content.length, Math.floor(streamingRevealProgress.value)),
  )
  target.displayContent = target.content.slice(0, nextLength)
}

function stopStreamingRenderLoop() {
  if (streamingAnimationFrameId === null) {
    return
  }

  window.cancelAnimationFrame(streamingAnimationFrameId)
  streamingAnimationFrameId = null
  streamingLastFrameTime = null
}

function handleStreamingFrame(timestamp: number) {
  const target = streamingRenderTarget.value

  if (!target) {
    stopStreamingRenderLoop()
    return
  }

  const deltaTime =
    streamingLastFrameTime === null ? 16.67 : timestamp - streamingLastFrameTime
  streamingLastFrameTime = timestamp

  const targetLength = target.content.length
  const revealedLength = target.displayContent?.length ?? 0

  if (revealedLength >= targetLength) {
    if (streamingCompleted.value) {
      completeStreamingRender()
      return
    }
  } else {
    streamingRevealProgress.value += (deltaTime / 1000) * STREAMING_CHARS_PER_SECOND

    if (streamingRevealProgress.value < revealedLength + 1) {
      streamingRevealProgress.value = revealedLength + 1
    }

    syncDisplayedStreamingContent(target)
  }

  streamingAnimationFrameId = window.requestAnimationFrame(handleStreamingFrame)
}

function ensureStreamingRenderLoop() {
  if (streamingAnimationFrameId !== null) {
    return
  }

  streamingAnimationFrameId = window.requestAnimationFrame(handleStreamingFrame)
}

function completeStreamingRender() {
  const target = streamingRenderTarget.value

  if (!target) {
    return
  }

  target.displayContent = target.content
  target.pending = false
  streamingRenderTarget.value = null
  streamingRevealProgress.value = 0
  streamingCompleted.value = false
  stopStreamingRenderLoop()
  streamingRenderCompletionResolver.value?.()
  streamingRenderCompletionResolver.value = null
}

function animateStreamingMessage(target: ChatMessage) {
  if (streamingRenderTarget.value !== target) {
    streamingRenderTarget.value = target
    streamingRevealProgress.value = target.displayContent?.length ?? 0
    syncDisplayedStreamingContent(target)
  }
  ensureStreamingRenderLoop()
}

function resetStreamingQueue() {
  stopStreamingRenderLoop()
  streamingRevealProgress.value = 0
  streamingCompleted.value = false
  streamingRenderTarget.value = null
  streamingRenderCompletionResolver.value?.()
  streamingRenderCompletionResolver.value = null
}

function waitForStreamingRender(target: ChatMessage) {
  if (!target.pending || streamingRenderTarget.value !== target) {
    return Promise.resolve()
  }

  return new Promise<void>(resolve => {
    streamingRenderCompletionResolver.value = resolve
  })
}

async function loadConversations() {
  const data = await listConversations()
  conversations.value = data.conversations.map(conversation => ({
    id: conversation.id,
    title: conversation.title,
    preview: conversation.title === "新会话" ? "等待第一条问题" : conversation.title,
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
  activeRetrievalMode.value = "knowledge_base"
  messages.value = data.messages.length
    ? toUiMessages(data.messages)
    : [
        {
          role: "assistant",
          content: "这个会话还没有消息，直接开始提问即可。",
        },
      ]

  const preview = buildConversationPreview(data.messages)
  conversations.value = conversations.value.map(conversation =>
    conversation.id === conversationId
      ? {
          ...conversation,
          title: data.conversation.title,
          preview,
        }
      : conversation,
  )
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
    askAbortController.value = new AbortController()
    resetStreamingQueue()

    if (activeConversationId.value) {
      const updated = await updateConversationTitle(activeConversationId.value, question)

      if (updated?.conversation) {
        activeConversationTitle.value = updated.conversation.title
      }
    }

    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: "",
      displayContent: "",
      pending: true,
      citations: [],
    }
    messages.value.push(assistantMessage)

    if (responseMode.value === "stream") {
      await postSse(
        "/api/rag/ask",
        {
          question,
          conversationId: activeConversationId.value,
        },
        {
          signal: askAbortController.value.signal,
          onEvent(message) {
            if (message.event === "started") {
              const payload = message.data as RagAnswerStartedEvent
              activeRetrievalMode.value = payload.retrievalMode
              activeRoutingReason.value = payload.routingReason
              assistantMessage.citations = payload.citations
              return
            }

            if (message.event === "delta") {
              const payload = message.data as RagAnswerChunkEvent
              assistantMessage.content += payload.delta
              animateStreamingMessage(assistantMessage)
              return
            }

            if (message.event === "completed") {
              const payload = message.data as RagAnswerCompletedEvent
              activeRetrievalMode.value = payload.retrievalMode
              activeRoutingReason.value = payload.routingReason
              assistantMessage.citations = payload.citations
              assistantMessage.content = payload.answer
              streamingCompleted.value = true
              animateStreamingMessage(assistantMessage)
            }
          },
        },
      )

      await waitForStreamingRender(assistantMessage)
    } else {
      const payload = await askRagQuestion(
        {
          question,
          conversationId: activeConversationId.value,
        },
        {
          signal: askAbortController.value.signal,
        },
      )

      activeRetrievalMode.value = payload.retrievalMode
      activeRoutingReason.value = payload.routingReason
      assistantMessage.content = payload.answer
      assistantMessage.citations = payload.citations
      assistantMessage.pending = false
    }

    await loadConversations()
    if (activeConversationId.value) {
      await selectConversation(activeConversationId.value)
    }
  } catch (error) {
    if (http.isCancel(error)) {
      resetStreamingQueue()
      const lastMessage = messages.value[messages.value.length - 1]

      if (lastMessage?.role === "assistant" && lastMessage.pending) {
        messages.value.pop()
      }

      messages.value.push({
        role: "assistant",
        content: "已中断本次生成。",
      })
      return
    }

    resetStreamingQueue()
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage?.role === "assistant" && lastMessage.pending) {
      messages.value.pop()
    }

    messages.value.push({
      role: "assistant",
      content:
        error instanceof Error
          ? `请求失败：${error.message}`
          : "请求失败，请稍后再试。",
    })
  } finally {
    resetStreamingQueue()
    askAbortController.value = null
    isAsking.value = false
  }
}

function stopAnswer() {
  askAbortController.value?.abort()
}

function changeResponseMode(mode: ResponseModeOption) {
  if (isAsking.value) {
    return
  }

  responseMode.value = mode
}

async function removeConversation(conversationId: string) {
  await deleteConversation(conversationId)

  if (activeConversationId.value === conversationId) {
    activeConversationId.value = undefined
    activeConversationTitle.value = ""
    activeRetrievalMode.value = "knowledge_base"
    activeRoutingReason.value = ""
    messages.value = [
      {
        role: "assistant",
        content: "会话已删除，请新建会话继续提问。",
      },
    ]
  }

  await loadConversations()
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
          @delete="removeConversation"
          @prompt="askQuestion"
        />

        <HomeChatArea
          :messages="messages"
          :stats="stats"
          :conversation-title="activeConversationTitle"
          :is-asking="isAsking"
          :retrieval-mode-label="retrievalModeLabel"
          :response-mode="responseMode"
          :can-switch-response-mode="!isAsking"
          @send="askQuestion"
          @stop="stopAnswer"
          @change-response-mode="changeResponseMode"
        />

        <HomeContextPanel />
      </main>
    </div>
  </div>
</template>
