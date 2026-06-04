import { registerAs } from "@nestjs/config"

function resolveDefaultChatModel(baseUrl: string) {
  if (baseUrl.includes("dashscope.aliyuncs.com")) {
    return "qwen-plus"
  }

  return "gpt-4.1-mini"
}

export const llmConfig = registerAs("llm", () => ({
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiApiBaseUrl: process.env.OPENAI_API_BASE_URL ?? "",
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-v4",
  chatModel:
    process.env.OPENAI_CHAT_MODEL ??
    resolveDefaultChatModel(process.env.OPENAI_API_BASE_URL ?? ""),
}))
