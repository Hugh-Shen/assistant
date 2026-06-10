<script setup lang="ts">
defineProps<{
  retrievalModeLabel?: string
  routingReason?: string
}>()
</script>

<template>
  <aside class="hidden flex-col gap-4 xl:flex">
    <section class="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <p class="text-sm font-semibold">Prompt tips</p>
      <div class="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <div class="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900/60">
          <p class="font-medium">1. 明确目标</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">先说要做什么，再说要什么风格。</p>
        </div>
        <div class="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900/60">
          <p class="font-medium">2. 提供约束</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">比如只用 shadcn、需要响应式、要深色模式。</p>
        </div>
        <div class="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900/60">
          <p class="font-medium">3. 指定输出</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">布局、交互、文案、状态都可以明确列出。</p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <p class="text-sm font-semibold">RAG debug</p>
      <div class="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <div class="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900/60">
          <p class="font-medium">retrievalMode</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ retrievalModeLabel || "Unknown" }}
          </p>
        </div>
        <div class="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900/60">
          <p class="font-medium">routingReason</p>
          <p class="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">
            {{ routingReason || "N/A" }}
          </p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <p class="text-sm font-semibold">System notes</p>
      <ul class="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <li class="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900/60">界面骨架已搭建，可直接接入真实消息流。</li>
        <li class="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900/60">当前按钮和菜单均来自 shadcn 风格组件。</li>
        <li class="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900/60">后续可以继续补充 Drawer、Textarea、ScrollArea 等组件。</li>
      </ul>
    </section>
  </aside>
</template>
