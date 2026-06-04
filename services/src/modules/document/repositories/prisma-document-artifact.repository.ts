import { Injectable } from "@nestjs/common"
import { Prisma } from "@prisma/client"
import type {
  DocumentChunkRecord,
  DocumentEmbeddingRecord,
} from "@assistant/shared"
import { PrismaService } from "../../../infra/db/prisma.service"
import type { DocumentArtifactRepository } from "../ports/document-artifact.repository.port"

function rowToChunk(record: {
  id: string
  documentId: string
  chunkIndex: number
  text: string
  characterCount: number
  tokenCount: number
  startOffset: number
  endOffset: number
}): DocumentChunkRecord {
  return {
    id: record.id,
    documentId: record.documentId,
    index: record.chunkIndex,
    text: record.text,
    characterCount: record.characterCount,
    tokenCount: record.tokenCount,
    startOffset: record.startOffset,
    endOffset: record.endOffset,
  }
}

function parseVectorLiteral(literal: string | number[] | null | undefined) {
  if (!literal) {
    return []
  }

  if (Array.isArray(literal)) {
    return literal.map(value => Number(value))
  }

  const normalized = literal.trim()
  const rawValues =
    normalized.startsWith("[") && normalized.endsWith("]")
      ? normalized.slice(1, -1)
      : normalized

  if (!rawValues) {
    return []
  }

  return rawValues.split(",").map(value => Number(value.trim()))
}

function rowToEmbedding(record: {
  id: string
  documentId: string
  chunkId: string
  model: string
  dimension: number
  embedding: unknown
  createdAt: Date
}): DocumentEmbeddingRecord {
  return {
    id: record.id,
    documentId: record.documentId,
    chunkId: record.chunkId,
    vector: parseVectorLiteral(record.embedding as string | number[] | null),
    model: record.model,
    dimension: record.dimension,
    createdAt: record.createdAt.toISOString(),
  }
}

function toVectorLiteral(values: number[]) {
  return `[${values.map(value => Number(value.toFixed(6))).join(",")}]`
}

@Injectable()
export class PrismaDocumentArtifactRepository
  implements DocumentArtifactRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async saveChunks(documentId: string, chunks: DocumentChunkRecord[]) {
    await this.prisma.$transaction(async transaction => {
      await transaction.documentChunk.deleteMany({
        where: { documentId },
      })

      if (chunks.length === 0) {
        return
      }

      await transaction.documentChunk.createMany({
        data: chunks.map(chunk => ({
          id: chunk.id,
          documentId,
          chunkIndex: chunk.index,
          text: chunk.text,
          characterCount: chunk.characterCount,
          tokenCount: chunk.tokenCount,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
        })),
      })
    })
  }

  async saveEmbeddings(documentId: string, embeddings: DocumentEmbeddingRecord[]) {
    await this.prisma.$transaction(async transaction => {
      // Prisma is still the persistence entrypoint here. We drop to raw SQL
      // only because pgvector columns are not handled by regular model CRUD.
      await transaction.$executeRaw(
        Prisma.sql`DELETE FROM document_embeddings WHERE document_id = ${documentId}`,
      )

      for (const embedding of embeddings) {
        await transaction.$executeRaw(
          Prisma.sql`
            INSERT INTO document_embeddings (
              id, document_id, chunk_id, model, dimension, embedding, created_at
            ) VALUES (
              ${embedding.id},
              ${documentId},
              ${embedding.chunkId},
              ${embedding.model},
              ${embedding.dimension},
              ${toVectorLiteral(embedding.vector)}::vector,
              ${new Date(embedding.createdAt)}
            )
          `,
        )
      }
    })
  }

  async listChunks(documentId: string) {
    const rows = await this.prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: "asc" },
    })

    return rows.map(rowToChunk)
  }

  async listEmbeddings(documentId: string) {
    // Read back vector literals through Prisma raw SQL so the repository stays
    // inside the Prisma boundary while supporting pgvector storage.
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string
        document_id: string
        chunk_id: string
        model: string
        dimension: number
        embedding: unknown
        created_at: Date
      }>
    >(
      Prisma.sql`
        SELECT id, document_id, chunk_id, model, dimension, embedding, created_at
        FROM document_embeddings
        WHERE document_id = ${documentId}
        ORDER BY created_at ASC
      `,
    )

    return rows.map(row =>
      rowToEmbedding({
        id: row.id,
        documentId: row.document_id,
        chunkId: row.chunk_id,
        model: row.model,
        dimension: row.dimension,
        embedding: row.embedding,
        createdAt: row.created_at,
      }),
    )
  }

  async countChunks(documentId: string) {
    return this.prisma.documentChunk.count({
      where: { documentId },
    })
  }

  async countEmbeddings(documentId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM document_embeddings
        WHERE document_id = ${documentId}
      `,
    )

    return Number(rows[0]?.count ?? 0)
  }
}
