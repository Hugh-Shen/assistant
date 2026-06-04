import type {
  DocumentProcessingEvent,
  DocumentProcessingEventRecord,
} from "@assistant/shared"

export const DOCUMENT_EVENT_REPOSITORY = Symbol("DOCUMENT_EVENT_REPOSITORY")

export interface DocumentEventRepository {
  append(event: DocumentProcessingEvent): Promise<DocumentProcessingEventRecord>
  list(documentId: string): Promise<DocumentProcessingEventRecord[]>
  listAfter(
    documentId: string,
    afterId?: number,
  ): Promise<DocumentProcessingEventRecord[]>
}
