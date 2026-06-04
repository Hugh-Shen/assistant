import { Inject, Injectable } from "@nestjs/common"
import type {
  DocumentChunkRecord,
  DocumentEmbeddingRecord,
  DocumentProcessingManifest,
} from "@assistant/shared"
import {
  DOCUMENT_ARTIFACT_REPOSITORY,
  type DocumentArtifactRepository,
} from "../ports/document-artifact.repository.port"
import {
  DOCUMENT_REPOSITORY,
  type DocumentRepository,
} from "../ports/document.repository.port"

@Injectable()
export class DocumentArtifactQueryService {
  constructor(
    @Inject(DOCUMENT_ARTIFACT_REPOSITORY)
    private readonly artifacts: DocumentArtifactRepository,
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documents: DocumentRepository,
  ) {}

  async getManifest(documentId: string) {
    const [document, chunks, embeddings] = await Promise.all([
      this.documents.findById(documentId),
      this.artifacts.countChunks(documentId),
      this.artifacts.countEmbeddings(documentId),
    ])

    return {
      documentId,
      sourceFileName: document.originalName,
      parser: "local-text-parser",
      vectorizer: "text-embedding-v4",
      chunkCount: chunks,
      embeddingCount: embeddings,
      updatedAt: document.updatedAt,
    } satisfies DocumentProcessingManifest
  }

  async getChunks(documentId: string) {
    return this.artifacts.listChunks(documentId)
  }

  async getEmbeddings(documentId: string) {
    return this.artifacts.listEmbeddings(documentId)
  }
}
