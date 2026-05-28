<script setup lang="ts">
import { Menu, Plus, Search, Sparkles } from "@lucide/vue"
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { Button } from "@/components/ui/button"
</script>

<template>
  <header class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" class="rounded-xl lg:hidden">
        <Menu class="size-5" />
      </Button>

      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900">
          <Sparkles class="size-5" />
        </div>
        <div>
          <p class="text-sm font-semibold leading-none">Assistant Studio</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Vue 3 + shadcn + Tailwind</p>
        </div>
      </div>
    </div>

    <Menubar class="border-slate-200/80 bg-white/90 shadow-none dark:border-white/10 dark:bg-slate-900/90">
      <MenubarMenu>
        <MenubarTrigger>Workspace</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New chat</MenubarItem>
          <MenubarItem>Import context</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Share workspace</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Model</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Fast</MenubarItem>
          <MenubarItem>Balanced</MenubarItem>
          <MenubarItem>Reasoning</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Compact</MenubarItem>
          <MenubarItem>Readable</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>

    <div class="flex items-center gap-2">
      <Button variant="outline" class="rounded-xl border-slate-200/80 bg-white/90 dark:border-white/10 dark:bg-slate-900/90">
        <Search class="size-4" />
        搜索
      </Button>
      <Button class="rounded-xl">
        <Plus class="size-4" />
        新建会话
      </Button>
    </div>
  </header>
</template>
