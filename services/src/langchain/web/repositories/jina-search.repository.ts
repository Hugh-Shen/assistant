import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type {
  WebSearchDocument,
  WebSearchRepository,
} from "../ports/web-search.repository"

function normalizeApiKey(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "")
}

function normalizeBaseUrl(value: string, fallback: string) {
  const normalized = value.trim().replace(/\/+$/, "")
  return normalized || fallback
}

function encodeQuery(query: string) {
  return encodeURIComponent(query).replace(/%20/g, "+")
}

function isJinaUrl(url: string) {
  return url.includes("jina.ai") || url.includes("jinaai.cn")
}

function appendUniqueResults<T extends { title: string; url: string }>(
  target: T[],
  items: T[],
  seen: Set<string>,
) {
  for (const item of items) {
    if (seen.has(item.url) || isJinaUrl(item.url)) {
      continue
    }

    seen.add(item.url)
    target.push(item)
  }
}

function parseMarkdownLinks(markdown: string) {
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
  const results: Array<{ title: string; url: string }> = []

  for (const match of markdown.matchAll(linkPattern)) {
    const title = match[1]?.trim()
    const url = match[2]?.trim()

    if (!title || !url || isJinaUrl(url)) {
      continue
    }

    results.push({ title, url })
  }

  return results
}

function parseJsonResults(payload: unknown) {
  const candidates = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        "results" in payload &&
        Array.isArray(payload.results)
      ? payload.results
      : []

  const results: Array<{ title: string; url: string; content?: string }> = []

  for (const item of candidates) {
    if (!item || typeof item !== "object") {
      continue
    }

    const title =
      typeof item.title === "string"
        ? item.title.trim()
        : typeof item.name === "string"
          ? item.name.trim()
          : ""
    const url =
      typeof item.url === "string"
        ? item.url.trim()
        : typeof item.link === "string"
          ? item.link.trim()
          : ""
    const content =
      typeof item.content === "string"
        ? item.content.trim()
        : typeof item.snippet === "string"
        ? item.snippet.trim()
        : undefined

    if (!title || !url || isJinaUrl(url)) {
      continue
    }

    results.push({ title, url, content })
  }

  return results
}

function parseBareUrls(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
  const results: Array<{ title: string; url: string }> = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!
    const urlMatch = line.match(/https?:\/\/\S+/)

    if (!urlMatch) {
      continue
    }

    const url = urlMatch[0]!.replace(/[),.;]+$/, "")

    if (isJinaUrl(url)) {
      continue
    }

    const previousLine = lines[index - 1] ?? ""
    const title = previousLine
      .replace(/^[-*#\d.\s]+/, "")
      .replace(/\[[^\]]+\]\([^)]+\)/g, "")
      .trim()

    if (!title) {
      continue
    }

    results.push({ title, url })
  }

  return results
}

function hasContent(
  item: { title: string; url: string } | { title: string; url: string; content?: string },
): item is { title: string; url: string; content?: string } {
  return "content" in item
}

@Injectable()
export class JinaSearchRepository implements WebSearchRepository {
  private readonly logger = new Logger(JinaSearchRepository.name)

  constructor(private readonly configService: ConfigService) {}

  async search(query: string, maxResults: number): Promise<WebSearchDocument[]> {
    const jinaApiKey = normalizeApiKey(
      this.configService.get<string>("rag.jinaApiKey", ""),
    )
    const baseUrl = normalizeBaseUrl(
      this.configService.get<string>("rag.jinaSearchBaseUrl", "https://s.jinaai.cn"),
      "https://s.jinaai.cn",
    )
    const timeoutMs = this.configService.get<number>("rag.jinaRequestTimeoutMs", 15000)

    try {
      const response = await fetch(`${baseUrl}/${encodeQuery(query)}`, {
        headers: this.buildHeaders(jinaApiKey),
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!response.ok) {
        this.logger.warn(
          `Jina search failed with status ${response.status} for query: ${query}`,
        )
        return []
      }

      const body = await response.text()
      const links: Array<{ title: string; url: string; content?: string }> = []
      const seen = new Set<string>()

      appendUniqueResults(links, parseJsonResults(this.tryParseJson(body)), seen)
      appendUniqueResults(links, parseMarkdownLinks(body), seen)
      appendUniqueResults(links, parseBareUrls(body), seen)

      if (links.length === 0) {
        this.logger.warn(`Jina search returned no parsable results for query: ${query}`)
      }

      return links.slice(0, maxResults).map((item, index) => ({
        title: item.title,
        url: item.url,
        snippet: hasContent(item) ? item.content : undefined,
        content: hasContent(item) ? item.content : undefined,
        score: Number((1 - index / Math.max(maxResults, 1)).toFixed(6)),
        source: "jina-search",
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Jina search request failed for query "${query}": ${message}`)
      return []
    }
  }

  private buildHeaders(jinaApiKey: string) {
    return {
      Authorization: `Bearer ${jinaApiKey}`,
      Accept: "text/plain",
      "X-Return-Format": "markdown",
    }
  }

  private tryParseJson(body: string) {
    try {
      return JSON.parse(body) as unknown
    } catch {
      return null
    }
  }
}
