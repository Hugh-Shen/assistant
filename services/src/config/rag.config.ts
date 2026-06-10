import { registerAs } from "@nestjs/config"

export const ragConfig = registerAs("rag", () => ({
  searchProvider: process.env.RAG_SEARCH_PROVIDER ?? "jina",
  maxKnowledgeBaseResults: Number(
    process.env.RAG_MAX_KNOWLEDGE_BASE_RESULTS ?? 4,
  ),
  maxWebResults: Number(process.env.RAG_MAX_WEB_RESULTS ?? 3),
  maxReaderResults: Number(process.env.RAG_MAX_READER_RESULTS ?? 2),
  knowledgeBaseFallbackMinScore: Number(
    process.env.RAG_KB_FALLBACK_MIN_SCORE ?? 0.05,
  ),
  knowledgeBaseUseOnlyMinScore: Number(
    process.env.RAG_KB_USE_ONLY_MIN_SCORE ?? 0.12,
  ),
  knowledgeBaseHighConfidenceMinScore: Number(
    process.env.RAG_KB_HIGH_CONFIDENCE_MIN_SCORE ?? 0.2,
  ),
  knowledgeBaseHighConfidenceMinCount: Number(
    process.env.RAG_KB_HIGH_CONFIDENCE_MIN_COUNT ?? 2,
  ),
  hybridBlendMaxScore: Number(process.env.RAG_HYBRID_BLEND_MAX_SCORE ?? 0.12),
  knowledgeBaseGenerationMinScore: Number(
    process.env.RAG_KB_GENERATION_MIN_SCORE ?? 0.1,
  ),
  webGenerationMinScore: Number(process.env.RAG_WEB_GENERATION_MIN_SCORE ?? 0.15),
  jinaApiKey: process.env.JINA_API_KEY ?? "",
  tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
}))
