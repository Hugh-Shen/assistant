import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type {
  WebPageRecord,
  WebReaderRepository,
} from "../ports/web-reader.repository"

function normalizeApiKey(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "")
}

function normalizeBaseUrl(value: string, fallback: string) {
  const normalized = value.trim().replace(/\/+$/, "")
  return normalized || fallback
}

function extractTitle(markdown: string, fallbackUrl: string) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return heading || fallbackUrl
}

@Injectable()
export class JinaReaderRepository implements WebReaderRepository {
  constructor(private readonly configService: ConfigService) {}

  async read(url: string): Promise<WebPageRecord | null> {
    const jinaApiKey = normalizeApiKey(
      this.configService.get<string>("rag.jinaApiKey", ""),
    )
    const baseUrl = normalizeBaseUrl(
      this.configService.get<string>("rag.jinaReaderBaseUrl", "https://r.jinaai.cn"),
      "https://r.jinaai.cn",
    )
    const timeoutMs = this.configService.get<number>("rag.jinaRequestTimeoutMs", 15000)
    try {
      const response = await fetch(`${baseUrl}/${url}`, {
        headers: this.buildHeaders(jinaApiKey),
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!response.ok) {
        return null
      }

      const content = (await response.text()).trim()

      if (!content) {
        return null
      }

      return {
        url,
        title: extractTitle(content, url),
        content,
      }
    } catch {
      return null
    }
  }

  private buildHeaders(jinaApiKey: string) {
    return {
      Authorization: `Bearer ${jinaApiKey}`,
      Accept: "text/plain",
      "X-Return-Format": "markdown",
    }
  }
}
