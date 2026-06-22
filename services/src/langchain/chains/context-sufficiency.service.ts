import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type { RagCitation } from "@assistant/shared"
import type { KnowledgeBaseRoutingDecision } from "./types/knowledge-base-routing-decision"

@Injectable()
export class ContextSufficiencyService {
  constructor(private readonly configService: ConfigService) {}

  async decideKnowledgeBaseRouting(
    _question: string,
    citations: RagCitation[],
  ): Promise<KnowledgeBaseRoutingDecision> {
    if (citations.length === 0) {
      return {
        shouldUseKnowledgeBaseOnly: false,
        shouldBlendWithWebSearch: false,
        shouldFallbackToWebSearch: true,
        confidence: "low",
        reason: "no_knowledge_base_results",
      }
    }

    const routeThreshold = this.configService.get<number>(
      "rag.knowledgeBaseRouteThreshold",
      0.85,
    )
    const topScore = citations[0]?.score ?? 0

    if (topScore >= routeThreshold) {
      return {
        shouldUseKnowledgeBaseOnly: true,
        shouldBlendWithWebSearch: false,
        shouldFallbackToWebSearch: false,
        confidence: "high",
        reason: "top_score_above_route_threshold",
      }
    }

    return {
      shouldUseKnowledgeBaseOnly: false,
      shouldBlendWithWebSearch: false,
      shouldFallbackToWebSearch: true,
      confidence: "low",
      reason: "top_score_below_route_threshold",
    }
  }
}
