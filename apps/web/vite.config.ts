import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from "node:path"
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, "./src"),
      '@assistant/utils': path.resolve(__dirname, "../../packages/utils/src"),
    }
  }
})
