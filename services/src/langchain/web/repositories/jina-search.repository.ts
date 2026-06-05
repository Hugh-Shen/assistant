import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type {
  WebSearchDocument,
  WebSearchRepository,
} from "../ports/web-search.repository"

function encodeQuery(query: string) {
  return encodeURIComponent(query).replace(/%20/g, "+")
}

function parseMarkdownLinks(markdown: string) {
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
  const results: Array<{ title: string; url: string }> = []
  const seen = new Set<string>()

  for (const match of markdown.matchAll(linkPattern)) {
    const title = match[1]?.trim()
    const url = match[2]?.trim()

    if (!title || !url || seen.has(url) || url.includes("jina.ai")) {
      continue
    }

    seen.add(url)
    results.push({ title, url })
  }

  return results
}

@Injectable()
export class JinaSearchRepository implements WebSearchRepository {
  constructor(private readonly configService: ConfigService) {}

  async search(query: string, maxResults: number): Promise<WebSearchDocument[]> {
    const jinaApiKey = this.configService.get<string>("rag.jinaApiKey", "")

    if (!jinaApiKey) {
      return []
    }

    const response = await fetch(`https://s.jina.ai/${encodeQuery(query)}`, {
      headers: {
        Authorization: `Bearer ${jinaApiKey}`,
        Accept: "text/plain",
        "X-Return-Format": "markdown",
      },
    })

    if (!response.ok) {
      return []
    }

    const markdown = await response.text()
    const links = parseMarkdownLinks(markdown).slice(0, maxResults)

    return links.map((item, index) => ({
      title: item.title,
      url: item.url,
      score: Number((1 - index / Math.max(maxResults, 1)).toFixed(6)),
      source: "jina-search",
    }))
  }
}
