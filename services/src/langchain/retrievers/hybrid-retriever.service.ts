import { Inject, Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type { RagCitation, RagRetrievalMode } from "@assistant/shared"
import { ContextSufficiencyService } from "../chains/context-sufficiency.service"
import { PgvectorRetrieverService } from "./pgvector-retriever.service"
import {
  WEB_READER_REPOSITORY,
  type WebReaderRepository,
} from "../web/ports/web-reader.repository"
import {
  WEB_SEARCH_REPOSITORY,
  type WebSearchRepository,
} from "../web/ports/web-search.repository"

interface HybridRetrievalResult {
  retrievalMode: RagRetrievalMode
  citations: RagCitation[]
  knowledgeBaseCitations: RagCitation[]
  webCitations: RagCitation[]
}

@Injectable()
export class HybridRetrieverService {
  constructor(
    private readonly knowledgeBaseRetriever: PgvectorRetrieverService,
    private readonly contextSufficiencyService: ContextSufficiencyService,
    @Inject(WEB_SEARCH_REPOSITORY)
    private readonly webSearchRepository: WebSearchRepository,
    @Inject(WEB_READER_REPOSITORY)
    private readonly webReaderRepository: WebReaderRepository,
    private readonly configService: ConfigService,
  ) {}

  async retrieve(
    question: string,
    topK = this.configService.get<number>("rag.maxKnowledgeBaseResults", 4),
  ): Promise<HybridRetrievalResult> {
    const knowledgeBaseCitations = await this.knowledgeBaseRetriever.search(
      question,
      topK,
    )
    const routing = await this.contextSufficiencyService.decideKnowledgeBaseRouting(
      question,
      knowledgeBaseCitations,
    )

    const needsWebSearch =
      routing.shouldBlendWithWebSearch || routing.shouldFallbackToWebSearch
    const webCitations = needsWebSearch ? await this.searchWeb(question) : []

    if (routing.shouldUseKnowledgeBaseOnly && webCitations.length === 0) {
      return {
        retrievalMode: "knowledge_base",
        citations: knowledgeBaseCitations,
        knowledgeBaseCitations,
        webCitations,
      }
    }

    if (
      (routing.shouldBlendWithWebSearch || routing.shouldUseKnowledgeBaseOnly) &&
      knowledgeBaseCitations.length > 0 &&
      webCitations.length > 0
    ) {
      return {
        retrievalMode: "hybrid",
        citations: [...knowledgeBaseCitations, ...webCitations],
        knowledgeBaseCitations,
        webCitations,
      }
    }

    if (webCitations.length > 0) {
      return {
        retrievalMode: "search",
        citations: webCitations,
        knowledgeBaseCitations,
        webCitations,
      }
    }

    if (knowledgeBaseCitations.length > 0) {
      return {
        retrievalMode: "knowledge_base",
        citations: knowledgeBaseCitations,
        knowledgeBaseCitations,
        webCitations,
      }
    }

    return {
      retrievalMode: "none",
      citations: [],
      knowledgeBaseCitations: [],
      webCitations: [],
    }
  }

  private async searchWeb(question: string): Promise<RagCitation[]> {
    const searchResults = await this.webSearchRepository.search(
      question,
      this.configService.get<number>("rag.maxWebResults", 3),
    )

    const readerTargets = searchResults.filter(result => !result.content).slice(
      0,
      this.configService.get<number>("rag.maxReaderResults", 2),
    )

    const readerResults = await Promise.allSettled(
      readerTargets.map(result => this.webReaderRepository.read(result.url)),
    )

    const readerContentByUrl = new Map(
      readerResults.flatMap(result =>
        result.status === "fulfilled" && result.value
          ? [[result.value.url, result.value]]
          : [],
      ),
    )

    const citations = searchResults
      .map((result, index) => {
        const page = readerContentByUrl.get(result.url)
        const text = page?.content || result.content || result.snippet || ""

        if (!text) {
          return null
        }

        return {
          sourceType: "web",
          source: result.source,
          title: page?.title || result.title,
          url: result.url,
          score: Number(
            (result.score ?? 1 - index / Math.max(searchResults.length, 1)).toFixed(
              6,
            ),
          ),
          text,
        } satisfies RagCitation
      })
      .filter(citation => citation !== null)

    return citations
  }
}
