import { existsSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { defineConfig, env } from "prisma/config"

for (const fileName of [".env.local", ".env"]) {
  const filePath = path.resolve(__dirname, fileName)

  if (existsSync(filePath)) {
    process.loadEnvFile(filePath)
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
})
