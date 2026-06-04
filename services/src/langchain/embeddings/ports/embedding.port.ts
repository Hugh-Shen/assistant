export const EMBEDDING_SERVICE = Symbol("EMBEDDING_SERVICE")

export interface EmbeddingResult {
  model: string
  vector: number[]
}

export interface EmbeddingService {
  embed(text: string): Promise<EmbeddingResult>
}
