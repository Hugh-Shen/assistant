import { Inject, Injectable } from "@nestjs/common"
import type {
  DocumentChunkRecord,
  DocumentEmbeddingRecord,
} from "@assistant/shared"
import {
  EMBEDDING_SERVICE,
  type EmbeddingService,
} from "../../../langchain/embeddings/ports/embedding.port"

@Injectable()
export class DocumentVectorizeService {
  constructor(
    @Inject(EMBEDDING_SERVICE)
    private readonly embeddings: EmbeddingService,
  ) {}

  /**
   * Converts parsed chunks into pgvector-ready embeddings via the embedding provider.
   */
  async vectorize(
    documentId: string,
    chunks: DocumentChunkRecord[],
  ): Promise<DocumentEmbeddingRecord[]> {
    return Promise.all(
      chunks.map(async chunk => {
        const embedded = await this.embeddings.embed(chunk.text)

        return {
          id: `${documentId}-embedding-${chunk.index + 1}`,
          documentId,
          chunkId: chunk.id,
          vector: embedded.vector,
          model: embedded.model,
          dimension: embedded.vector.length,
          createdAt: new Date().toISOString(),
        }
      }),
    )
  }
}
