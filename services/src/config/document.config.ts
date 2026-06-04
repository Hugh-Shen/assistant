import { registerAs } from "@nestjs/config"

export const documentConfig = registerAs("document", () => ({
  storageRoot: process.env.DOCUMENT_STORAGE_ROOT ?? "storage/documents",
  redisUrl: process.env.REDIS_URL ?? "",
}))
