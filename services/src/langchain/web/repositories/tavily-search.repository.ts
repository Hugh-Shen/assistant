import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type {
  WebSearchDocument,
  WebSearchRepository,
} from "../ports/web-search.repository"

interface TavilySearchResponse {
  results?: Array<{
    title?: string
    url?: string
    content?: string
    score?: number
  }>
}

@Injectable()
export class TavilySearchRepository implements WebSearchRepository {
  constructor(private readonly configService: ConfigService) {}

  async search(query: string, maxResults: number): Promise<WebSearchDocument[]> {
    const tavilyApiKey = this.configService.get<string>("rag.tavilyApiKey", "")

    if (!tavilyApiKey) {
      return []
    }

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tavilyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        search_depth: "advanced",
        max_results: maxResults,
        chunks_per_source: 2,
        include_answer: false,
        include_raw_content: "markdown",
      }),
    })

    if (!response.ok) {
      return []
    }

    const payload = (await response.json()) as TavilySearchResponse

    return (payload.results ?? [])
      .filter(result => result.title && result.url)
      .slice(0, maxResults)
      .map(result => ({
        title: result.title!,
        url: result.url!,
        content: result.content,
        snippet: result.content?.slice(0, 400),
        score: result.score,
        source: "tavily",
      }))
  }
}
