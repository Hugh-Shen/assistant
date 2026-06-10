export type RagSourceType = "knowledge_base" | "web"

export type RagRetrievalMode =
  | "knowledge_base"
  | "search"
  | "hybrid"
  | "none"

export interface RagAskRequest {
  question: string
  topK?: number
  conversationId?: string
}

export interface RagCitation {
  sourceType: RagSourceType
  source?: string
  title?: string
  url?: string
  documentId?: string
  chunkId?: string
  score: number
  text: string
}

export interface RagAskResponse {
  question: string
  answer: string
  retrievalMode: RagRetrievalMode
  routingReason: string
  citations: RagCitation[]
}

export interface RagAnswerStartedEvent {
  question: string
  retrievalMode: RagRetrievalMode
  routingReason: string
  citations: RagCitation[]
}

export interface RagAnswerChunkEvent {
  delta: string
}

export interface RagAnswerCompletedEvent {
  question: string
  answer: string
  retrievalMode: RagRetrievalMode
  routingReason: string
  citations: RagCitation[]
}
