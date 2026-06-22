import { Inject, Injectable, Logger } from "@nestjs/common"
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
import type {
  HybridRetrievalResult,
  RetrievalResolutionContext,
} from "./types/hybrid-retrieval.types"

@Injectable()
export class HybridRetrieverService {
  private readonly logger = new Logger(HybridRetrieverService.name)

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
    const rawKnowledgeBaseCitations = await this.knowledgeBaseRetriever.search(
      question,
      topK,
    )
    const knowledgeBaseCitations = this.filterKnowledgeBaseCitations(
      rawKnowledgeBaseCitations,
    )
    const routing = await this.contextSufficiencyService.decideKnowledgeBaseRouting(
      question,
      knowledgeBaseCitations,
    )
    const searchAvailable = this.isSearchAvailable()

    const needsWebSearch =
      routing.shouldBlendWithWebSearch || routing.shouldFallbackToWebSearch
    const webCitations =
      needsWebSearch && searchAvailable ? await this.searchWeb(question) : []

    if (needsWebSearch && !searchAvailable) {
      this.logger.warn("Web search was requested by routing but provider is unavailable")
    }

    if (needsWebSearch && searchAvailable && webCitations.length === 0) {
      this.logger.warn("Web search was requested by routing but returned no citations")
    }

    return this.resolveRetrievalResult({
      routing,
      needsWebSearch,
      searchAvailable,
      knowledgeBaseCitations,
      webCitations,
    })
  }

  private isSearchAvailable() {
    const provider = this.configService.get<string>("rag.searchProvider", "jina")

    if (provider === "tavily") {
      return Boolean(this.configService.get<string>("rag.tavilyApiKey", ""))
    }

    return Boolean(this.configService.get<string>("rag.jinaApiKey", ""))
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

    return citations.filter(
      citation =>
        citation.score >=
        this.configService.get<number>("rag.webGenerationMinScore", 0.15),
    )
  }

  private filterKnowledgeBaseCitations(citations: RagCitation[]) {
    const minScore = this.configService.get<number>(
      "rag.knowledgeBaseGenerationMinScore",
      0.1,
    )

    return citations.filter(citation => citation.score >= minScore)
  }

  private resolveRetrievalResult(
    context: RetrievalResolutionContext,
  ): HybridRetrievalResult {
    const {
      routing,
      needsWebSearch,
      searchAvailable,
      knowledgeBaseCitations,
      webCitations,
    } = context

    if (routing.shouldUseKnowledgeBaseOnly && webCitations.length === 0) {
      return this.buildResult(
        "knowledge_base",
        routing.reason,
        knowledgeBaseCitations,
        knowledgeBaseCitations,
        webCitations,
      )
    }

    if (this.shouldReturnHybrid(context)) {
      return this.buildResult(
        "hybrid",
        routing.reason,
        [...knowledgeBaseCitations, ...webCitations],
        knowledgeBaseCitations,
        webCitations,
      )
    }

    if (webCitations.length > 0) {
      return this.buildResult(
        "search",
        routing.reason,
        webCitations,
        knowledgeBaseCitations,
        webCitations,
      )
    }

    if (routing.shouldUseKnowledgeBaseOnly && knowledgeBaseCitations.length > 0) {
      return this.buildResult(
        "knowledge_base",
        this.resolveFallbackReason(
          routing.reason,
          needsWebSearch,
          searchAvailable,
          "_search_unavailable_fallback_to_knowledge_base",
        ),
        knowledgeBaseCitations,
        knowledgeBaseCitations,
        webCitations,
      )
    }

    return this.buildResult(
      "none",
      this.resolveFallbackReason(
        routing.reason,
        needsWebSearch,
        searchAvailable,
        "_search_unavailable",
      ),
      [],
      [],
      webCitations,
    )
  }

  private shouldReturnHybrid(context: RetrievalResolutionContext) {
    return (
      (context.routing.shouldBlendWithWebSearch ||
        context.routing.shouldUseKnowledgeBaseOnly) &&
      context.knowledgeBaseCitations.length > 0 &&
      context.webCitations.length > 0
    )
  }

  private resolveFallbackReason(
    routingReason: string,
    needsWebSearch: boolean,
    searchAvailable: boolean,
    unavailableSuffix: string,
  ) {
    if (needsWebSearch && !searchAvailable) {
      return `${routingReason}${unavailableSuffix}`
    }

    return routingReason
  }

  private buildResult(
    retrievalMode: RagRetrievalMode,
    routingReason: string,
    citations: RagCitation[],
    knowledgeBaseCitations: RagCitation[],
    webCitations: RagCitation[],
  ): HybridRetrievalResult {
    return {
      retrievalMode,
      routingReason,
      citations,
      knowledgeBaseCitations,
      webCitations,
    }
  }
}
