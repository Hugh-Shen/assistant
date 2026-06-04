export interface RagAskRequest {
  question: string
  topK?: number
  conversationId?: string
}

export interface RagCitation {
  documentId: string
  chunkId: string
  score: number
  text: string
}

export interface RagAskResponse {
  question: string
  answer: string
  citations: RagCitation[]
}
