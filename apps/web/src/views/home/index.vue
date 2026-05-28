<script setup lang="ts">
import {
  type ChatMessage,
  type ChatStat,
  type ConversationItem,
  HomeChatArea,
  HomeContextPanel,
  HomeSidebar,
  HomeTopbar,
} from "./components"

const conversations: ConversationItem[] = [
  {
    title: "构建产品页文案",
    preview: "根据目标用户整理首页卖点和 CTA。",
  },
  {
    title: "设计系统整理",
    preview: "统一 Tailwind tokens 和 shadcn 组件命名。",
  },
  {
    title: "接口联调清单",
    preview: "补齐表单、鉴权、列表和空态流程。",
  },
]

const quickPrompts = [
  "帮我把这个页面改成更像 GPT 的布局",
  "给我一个组件拆分建议",
  "把输入框做成多行聊天框",
  "补充暗色模式视觉层次",
]

const messages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "我可以帮你搭建一个更接近 GPT 的工作台：左侧会话、中间聊天区、右侧上下文面板，以及底部输入框。",
  },
  {
    role: "user",
    content:
      "请优先使用 shadcn 组件，整体风格要简洁、偏产品化，不要太花哨。",
  },
  {
    role: "assistant",
    content:
      "收到。下面这个页面已经按这个方向做了一个可直接继续迭代的首页骨架。",
  },
]

const stats: ChatStat[] = [
  { label: "上下文窗口", value: "32k" },
  { label: "响应模式", value: "流式" },
  { label: "当前模型", value: "GPT-like" },
]
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_35%),linear-gradient(to_bottom_right,_#fafafa,_#f3f4f6)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_35%),linear-gradient(to_bottom_right,_#09090b,_#111827)] dark:text-slate-50">
    <div class="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 lg:px-6">
      <HomeTopbar />

      <main class="grid flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <HomeSidebar
          :conversations="conversations"
          :quick-prompts="quickPrompts"
        />

        <HomeChatArea
          :messages="messages"
          :stats="stats"
        />

        <HomeContextPanel />
      </main>
    </div>
  </div>
</template>
