export interface TavilySearchResponse {
  results?: Array<{
    title?: string
    url?: string
    content?: string
    score?: number
  }>
}
