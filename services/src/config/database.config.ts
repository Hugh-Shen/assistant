import { registerAs } from "@nestjs/config"

export const databaseConfig = registerAs("database", () => ({
  url: process.env.DATABASE_URL ?? "",
  ssl: (process.env.DATABASE_SSL ?? "false") === "true",
  documentEmbeddingDimension: Number(
    process.env.DOCUMENT_EMBEDDING_DIMENSION ?? 12,
  ),
}))
