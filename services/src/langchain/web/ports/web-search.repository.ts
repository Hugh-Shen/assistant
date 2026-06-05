export const WEB_SEARCH_REPOSITORY = Symbol("WEB_SEARCH_REPOSITORY")

export interface WebSearchDocument {
  title: string
  url: string
  snippet?: string
  content?: string
  score?: number
  source: "jina-search" | "tavily"
}

export interface WebSearchRepository {
  search(query: string, maxResults: number): Promise<WebSearchDocument[]>
}
