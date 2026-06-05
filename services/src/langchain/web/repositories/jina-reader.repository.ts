import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type {
  WebPageRecord,
  WebReaderRepository,
} from "../ports/web-reader.repository"

function extractTitle(markdown: string, fallbackUrl: string) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return heading || fallbackUrl
}

@Injectable()
export class JinaReaderRepository implements WebReaderRepository {
  constructor(private readonly configService: ConfigService) {}

  async read(url: string): Promise<WebPageRecord | null> {
    const jinaApiKey = this.configService.get<string>("rag.jinaApiKey", "")
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        ...(jinaApiKey
          ? { Authorization: `Bearer ${jinaApiKey}` }
          : {}),
        Accept: "text/plain",
        "X-Return-Format": "markdown",
      },
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
  }
}
