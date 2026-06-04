import { Injectable } from "@nestjs/common"
import { Prisma } from "@prisma/client"
import type { RagCitation } from "@assistant/shared"
import { PrismaService } from "../../infra/db/prisma.service"
import type { EmbeddingService } from "../embeddings/ports/embedding.port"
import { EMBEDDING_SERVICE } from "../embeddings/ports/embedding.port"
import { Inject } from "@nestjs/common"

@Injectable()
export class PgvectorRetrieverService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMBEDDING_SERVICE)
    private readonly embeddings: EmbeddingService,
  ) {}

  async search(question: string, topK = 4): Promise<RagCitation[]> {
    const embedded = await this.embeddings.embed(question)
    const vectorLiteral = `[${embedded.vector.join(",")}]`

    const rows = await this.prisma.$queryRaw<
      Array<{
        document_id: string
        chunk_id: string
        text: string
        distance: number
      }>
    >(
      Prisma.sql`
        SELECT
          de.document_id,
          de.chunk_id,
          dc.text,
          de.embedding <=> ${vectorLiteral}::vector AS distance
        FROM document_embeddings de
        INNER JOIN document_chunks dc ON dc.id = de.chunk_id
        ORDER BY de.embedding <=> ${vectorLiteral}::vector ASC
        LIMIT ${topK}
      `,
    )

    return rows.map(row => ({
      documentId: row.document_id,
      chunkId: row.chunk_id,
      text: row.text,
      score: Number((1 - row.distance).toFixed(6)),
    }))
  }
}
