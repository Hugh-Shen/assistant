import type { DocumentRecord } from "@assistant/shared"

export const DOCUMENT_REPOSITORY = Symbol("DOCUMENT_REPOSITORY")

export interface DocumentRepository {
  create(record: DocumentRecord): Promise<DocumentRecord>
  update(documentId: string, partial: Partial<DocumentRecord>): Promise<DocumentRecord>
  findById(documentId: string): Promise<DocumentRecord>
  list(): Promise<DocumentRecord[]>
}
