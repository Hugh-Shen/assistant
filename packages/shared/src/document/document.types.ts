export type DocumentStatus = "queued" | "processing" | "completed" | "failed"

export type DocumentProcessingStage =
  | "uploaded"
  | "queued"
  | "parsing"
  | "chunking"
  | "vectorizing"
  | "reindexing"
  | "completed"
  | "failed"

export interface DocumentRecord {
  id: string
  title: string
  originalName: string
  mimeType: string
  size: number
  storagePath: string
  status: DocumentStatus
  progress: number
  createdAt: string
  updatedAt: string
  errorMessage?: string
}

export interface DocumentProcessingEvent {
  documentId: string
  stage: DocumentProcessingStage
  progress: number
  message: string
  detail?: string
  timestamp: string
}

export interface DocumentProcessingEventRecord
  extends DocumentProcessingEvent {
  id: number
  createdAt: string
}

export interface DocumentChunkRecord {
  id: string
  documentId: string
  index: number
  text: string
  characterCount: number
  tokenCount: number
  startOffset: number
  endOffset: number
}

export interface DocumentEmbeddingRecord {
  id: string
  documentId: string
  chunkId: string
  vector: number[]
  model: string
  dimension: number
  createdAt: string
}

export interface DocumentProcessingManifest {
  documentId: string
  sourceFileName: string
  parser: string
  vectorizer: string
  chunkCount: number
  embeddingCount: number
  updatedAt: string
}

export interface UploadDocumentResponse {
  document: DocumentRecord
  eventsUrl: string
}
