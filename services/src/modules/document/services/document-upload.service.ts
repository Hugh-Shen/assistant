import { Inject, Injectable } from "@nestjs/common"
import { randomUUID } from "node:crypto"
import { extname } from "node:path"
import type { Express } from "express"
import type { DocumentRecord, UploadDocumentResponse } from "@assistant/shared"
import { DocumentEventsService } from "./document-events.service"
import { DocumentQueueService } from "./document-queue.service"
import {
  DOCUMENT_REPOSITORY,
  type DocumentRepository,
} from "../ports/document.repository.port"
import { LocalDocumentStorageService } from "../../../infra/storage/local-document-storage.service"
import { UploadDocumentRequestDto } from "../dto/upload-document.request.dto"

@Injectable()
export class DocumentUploadService {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly repository: DocumentRepository,
    private readonly storage: LocalDocumentStorageService,
    private readonly queue: DocumentQueueService,
    private readonly events: DocumentEventsService,
  ) {}

  private getDefaultTitle(fileName: string) {
    const extension = extname(fileName)
    return (
      fileName.slice(0, fileName.length - extension.length) ||
      "Untitled Document"
    )
  }

  async upload(
    file: Express.Multer.File,
    body: UploadDocumentRequestDto,
  ): Promise<UploadDocumentResponse> {
    const documentId = randomUUID()
    const storedFile = await this.storage.save(documentId, file)
    const now = new Date().toISOString()

    const record: DocumentRecord = await this.repository.create({
      id: documentId,
      title: body.title?.trim() || this.getDefaultTitle(file.originalname),
      originalName: file.originalname,
      mimeType: file.mimetype || "application/octet-stream",
      size: file.size,
      storagePath: storedFile.storagePath,
      status: "queued",
      progress: 0,
      createdAt: now,
      updatedAt: now,
    })

    await this.events.emit({
      documentId,
      stage: "uploaded",
      progress: 5,
      message: "文档已接收并写入本地存储",
      detail: storedFile.storagePath,
      timestamp: now,
    })

    await this.events.emit({
      documentId,
      stage: "queued",
      progress: 10,
      message: "文档已进入处理队列",
      detail: "等待异步解析与向量化",
      timestamp: now,
    })

    await this.queue.enqueue(documentId)

    return {
      document: record,
      eventsUrl: `/api/documents/${documentId}/events`,
    }
  }
}
