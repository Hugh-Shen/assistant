import { Injectable, NotFoundException } from "@nestjs/common"
import type { DocumentRecord } from "@assistant/shared"
import { PrismaService } from "../../../infra/db/prisma.service"
import type { DocumentRepository } from "../ports/document.repository.port"

function rowToDocument(record: {
  id: string
  title: string
  originalName: string
  mimeType: string
  size: bigint
  storagePath: string
  status: string
  progress: number
  createdAt: Date
  updatedAt: Date
  errorMessage: string | null
}): DocumentRecord {
  return {
    id: record.id,
    title: record.title,
    originalName: record.originalName,
    mimeType: record.mimeType,
    size: Number(record.size),
    storagePath: record.storagePath,
    status: record.status as DocumentRecord["status"],
    progress: record.progress,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    errorMessage: record.errorMessage ?? undefined,
  }
}

@Injectable()
export class PrismaDocumentRepository implements DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(record: DocumentRecord) {
    const created = await this.prisma.document.create({
      data: {
        id: record.id,
        title: record.title,
        originalName: record.originalName,
        mimeType: record.mimeType,
        size: BigInt(record.size),
        storagePath: record.storagePath,
        status: record.status,
        progress: record.progress,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
        errorMessage: record.errorMessage ?? null,
      },
    })

    return rowToDocument(created)
  }

  async update(documentId: string, partial: Partial<DocumentRecord>) {
    const current = await this.findById(documentId)
    const nextRecord = {
      ...current,
      ...partial,
      updatedAt: new Date().toISOString(),
    }

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        title: nextRecord.title,
        originalName: nextRecord.originalName,
        mimeType: nextRecord.mimeType,
        size: BigInt(nextRecord.size),
        storagePath: nextRecord.storagePath,
        status: nextRecord.status,
        progress: nextRecord.progress,
        updatedAt: new Date(nextRecord.updatedAt),
        errorMessage: nextRecord.errorMessage ?? null,
      },
    })

    return rowToDocument(updated)
  }

  async findById(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      throw new NotFoundException(`Document not found: ${documentId}`)
    }

    return rowToDocument(document)
  }

  async list() {
    const documents = await this.prisma.document.findMany({
      orderBy: { createdAt: "desc" },
    })

    return documents.map(rowToDocument)
  }
}
