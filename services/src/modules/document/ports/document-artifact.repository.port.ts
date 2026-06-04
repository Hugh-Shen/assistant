import type {
  DocumentChunkRecord,
  DocumentEmbeddingRecord,
} from "@assistant/shared"

export const DOCUMENT_ARTIFACT_REPOSITORY = Symbol("DOCUMENT_ARTIFACT_REPOSITORY")

export interface DocumentArtifactRepository {
  saveChunks(
    documentId: string,
    chunks: DocumentChunkRecord[],
  ): Promise<void>
  saveEmbeddings(
    documentId: string,
    embeddings: DocumentEmbeddingRecord[],
  ): Promise<void>
  listChunks(documentId: string): Promise<DocumentChunkRecord[]>
  listEmbeddings(documentId: string): Promise<DocumentEmbeddingRecord[]>
  countChunks(documentId: string): Promise<number>
  countEmbeddings(documentId: string): Promise<number>
}
