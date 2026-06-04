import { Injectable } from "@nestjs/common"
import type {
  DocumentProcessingEvent,
  DocumentProcessingEventRecord,
} from "@assistant/shared"
import type { DocumentEventRepository } from "../ports/document-event.repository.port"

@Injectable()
export class InMemoryDocumentEventRepository
  implements DocumentEventRepository
{
  private readonly history = new Map<string, DocumentProcessingEventRecord[]>()
  private nextId = 1

  async append(event: DocumentProcessingEvent) {
    const existingHistory = this.history.get(event.documentId) ?? []
    const created: DocumentProcessingEventRecord = {
      ...event,
      id: this.nextId,
      createdAt: new Date().toISOString(),
    }
    this.nextId += 1
    existingHistory.push(created)
    this.history.set(event.documentId, existingHistory)
    return created
  }

  async list(documentId: string) {
    return this.history.get(documentId) ?? []
  }

  async listAfter(documentId: string, afterId = 0) {
    const history = this.history.get(documentId) ?? []
    return history.filter(event => event.id > afterId)
  }
}
