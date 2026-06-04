import { Injectable } from "@nestjs/common"
import type {
  DocumentProcessingEvent,
  DocumentProcessingEventRecord,
} from "@assistant/shared"
import { PrismaService } from "../../../infra/db/prisma.service"
import type { DocumentEventRepository } from "../ports/document-event.repository.port"

function rowToEvent(record: {
  id: number
  documentId: string
  stage: string
  progress: number
  message: string
  detail: string | null
  timestamp: Date
  createdAt: Date
}): DocumentProcessingEventRecord {
  return {
    id: record.id,
    documentId: record.documentId,
    stage: record.stage as DocumentProcessingEvent["stage"],
    progress: record.progress,
    message: record.message,
    detail: record.detail ?? undefined,
    timestamp: record.timestamp.toISOString(),
    createdAt: record.createdAt.toISOString(),
  }
}

@Injectable()
export class PrismaDocumentEventRepository implements DocumentEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async append(event: DocumentProcessingEvent) {
    const created = await this.prisma.documentEvent.create({
      data: {
        documentId: event.documentId,
        stage: event.stage,
        progress: event.progress,
        message: event.message,
        detail: event.detail ?? null,
        timestamp: new Date(event.timestamp),
      },
    })

    return rowToEvent({
      ...created,
      documentId: created.documentId,
      detail: created.detail,
    })
  }

  async list(documentId: string) {
    const rows = await this.prisma.documentEvent.findMany({
      where: { documentId },
      orderBy: { id: "asc" },
    })

    return rows.map(row =>
      rowToEvent({
        id: row.id,
        documentId: row.documentId,
        stage: row.stage,
        progress: row.progress,
        message: row.message,
        detail: row.detail,
        timestamp: row.timestamp,
        createdAt: row.createdAt,
      }),
    )
  }

  async listAfter(documentId: string, afterId = 0) {
    const rows = await this.prisma.documentEvent.findMany({
      where: {
        documentId,
        id: {
          gt: afterId,
        },
      },
      orderBy: { id: "asc" },
    })

    return rows.map(row =>
      rowToEvent({
        id: row.id,
        documentId: row.documentId,
        stage: row.stage,
        progress: row.progress,
        message: row.message,
        detail: row.detail,
        timestamp: row.timestamp,
        createdAt: row.createdAt,
      }),
    )
  }
}
