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
      '@assistant/shared': path.resolve(__dirname, "../../packages/shared/src"),
    }
  },
  server: {
    port: Number(process.env.PORT) || 8080,
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL || "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
})
