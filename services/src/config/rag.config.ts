import { registerAs } from "@nestjs/config"

function parseSimilarityThreshold(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  if (parsed > 1) {
    return parsed / 10
  }

  return parsed
}

export const ragConfig = registerAs("rag", () => ({
  searchProvider: process.env.RAG_SEARCH_PROVIDER ?? "jina",
  maxKnowledgeBaseResults: Number(
    process.env.RAG_MAX_KNOWLEDGE_BASE_RESULTS ?? 4,
  ),
  maxWebResults: Number(process.env.RAG_MAX_WEB_RESULTS ?? 3),
  maxReaderResults: Number(process.env.RAG_MAX_READER_RESULTS ?? 2),
  knowledgeBaseRouteThreshold: parseSimilarityThreshold(
    process.env.RAG_KB_ROUTE_THRESHOLD,
    0.85,
  ),
  knowledgeBaseGenerationMinScore: Number(
    process.env.RAG_KB_GENERATION_MIN_SCORE ?? 0.1,
  ),
  webGenerationMinScore: Number(process.env.RAG_WEB_GENERATION_MIN_SCORE ?? 0.15),
  jinaSearchBaseUrl: process.env.JINA_SEARCH_BASE_URL ?? "https://s.jinaai.cn",
  jinaReaderBaseUrl: process.env.JINA_READER_BASE_URL ?? "https://r.jinaai.cn",
  jinaRequestTimeoutMs: Number(process.env.JINA_REQUEST_TIMEOUT_MS ?? 15000),
  jinaApiKey: process.env.JINA_API_KEY ?? "",
  tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
}))
