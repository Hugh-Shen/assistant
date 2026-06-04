import { Module } from "@nestjs/common"
import { PrismaModule } from "../infra/db/prisma.module"
import { AnswerGenerationService } from "./chains/answer-generation.service"
import { EMBEDDING_SERVICE } from "./embeddings/ports/embedding.port"
import { OpenAiEmbeddingRepository } from "./embeddings/repositories/openai-embedding.repository"
import { PgvectorRetrieverService } from "./retrievers/pgvector-retriever.service"

@Module({
  imports: [PrismaModule],
  providers: [
    OpenAiEmbeddingRepository,
    PgvectorRetrieverService,
    AnswerGenerationService,
    {
      provide: EMBEDDING_SERVICE,
      useExisting: OpenAiEmbeddingRepository,
    },
  ],
  exports: [
    EMBEDDING_SERVICE,
    OpenAiEmbeddingRepository,
    PgvectorRetrieverService,
    AnswerGenerationService,
  ],
})
export class LangchainModule {}
