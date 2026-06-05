import { Module } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PrismaModule } from "../infra/db/prisma.module"
import { AnswerGenerationService } from "./chains/answer-generation.service"
import { ContextSufficiencyService } from "./chains/context-sufficiency.service"
import { EMBEDDING_SERVICE } from "./embeddings/ports/embedding.port"
import { OpenAiEmbeddingRepository } from "./embeddings/repositories/openai-embedding.repository"
import { HybridRetrieverService } from "./retrievers/hybrid-retriever.service"
import { PgvectorRetrieverService } from "./retrievers/pgvector-retriever.service"
import { LLM_CLIENT_REPOSITORY } from "./shared/ports/llm-client.port"
import { OpenAiClientRepository } from "./shared/repositories/openai-client.repository"
import { WEB_READER_REPOSITORY } from "./web/ports/web-reader.repository"
import { WEB_SEARCH_REPOSITORY } from "./web/ports/web-search.repository"
import { JinaReaderRepository } from "./web/repositories/jina-reader.repository"
import { JinaSearchRepository } from "./web/repositories/jina-search.repository"
import { TavilySearchRepository } from "./web/repositories/tavily-search.repository"

@Module({
  imports: [PrismaModule],
  providers: [
    OpenAiClientRepository,
    OpenAiEmbeddingRepository,
    PgvectorRetrieverService,
    HybridRetrieverService,
    AnswerGenerationService,
    ContextSufficiencyService,
    JinaReaderRepository,
    JinaSearchRepository,
    TavilySearchRepository,
    {
      provide: EMBEDDING_SERVICE,
      useExisting: OpenAiEmbeddingRepository,
    },
    {
      provide: LLM_CLIENT_REPOSITORY,
      useExisting: OpenAiClientRepository,
    },
    {
      provide: WEB_READER_REPOSITORY,
      useExisting: JinaReaderRepository,
    },
    {
      provide: WEB_SEARCH_REPOSITORY,
      inject: [ConfigService, JinaSearchRepository, TavilySearchRepository],
      useFactory: (
        configService: ConfigService,
        jinaSearchRepository: JinaSearchRepository,
        tavilySearchRepository: TavilySearchRepository,
      ) =>
        configService.get<string>("rag.searchProvider", "jina") === "tavily"
          ? tavilySearchRepository
          : jinaSearchRepository,
    },
  ],
  exports: [
    EMBEDDING_SERVICE,
    LLM_CLIENT_REPOSITORY,
    OpenAiEmbeddingRepository,
    PgvectorRetrieverService,
    HybridRetrieverService,
    AnswerGenerationService,
    ContextSufficiencyService,
  ],
})
export class LangchainModule {}
