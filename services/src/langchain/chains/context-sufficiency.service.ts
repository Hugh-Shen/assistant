import { Inject, Injectable } from "@nestjs/common"
import { ConfigService, ConfigType } from "@nestjs/config"
import type { RagCitation } from "@assistant/shared"
import { llmConfig } from "../../config"
import {
  LLM_CLIENT_REPOSITORY,
  type LlmClientRepository,
} from "../shared/ports/llm-client.port"

interface KnowledgeBaseRoutingDecision {
  shouldUseKnowledgeBaseOnly: boolean
  shouldBlendWithWebSearch: boolean
  shouldFallbackToWebSearch: boolean
  confidence: "high" | "medium" | "low"
  reason: string
}

@Injectable()
export class ContextSufficiencyService {
  constructor(
    @Inject(LLM_CLIENT_REPOSITORY)
    private readonly llmClientRepository: LlmClientRepository,
    private readonly configService: ConfigService,
    @Inject(llmConfig.KEY)
    private readonly llm: ConfigType<typeof llmConfig>,
  ) {}

  async decideKnowledgeBaseRouting(
    question: string,
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

    const minScore = this.configService.get<number>(
      "rag.knowledgeBaseFallbackMinScore",
      0.05,
    )
    const useOnlyMinScore = this.configService.get<number>(
      "rag.knowledgeBaseUseOnlyMinScore",
      0.12,
    )
    const highConfidenceMinScore = this.configService.get<number>(
      "rag.knowledgeBaseHighConfidenceMinScore",
      0.2,
    )
    const highConfidenceMinCount = this.configService.get<number>(
      "rag.knowledgeBaseHighConfidenceMinCount",
      2,
    )
    const hybridBlendMaxScore = this.configService.get<number>(
      "rag.hybridBlendMaxScore",
      0.12,
    )
    const topScore = citations[0]?.score ?? 0
    const secondScore = citations[1]?.score ?? 0
    const relevantCount = citations.filter(
      citation => citation.score >= minScore,
    ).length
    const highConfidenceCount = citations.filter(
      citation => citation.score >= highConfidenceMinScore,
    ).length

    if (topScore < minScore) {
      return {
        shouldUseKnowledgeBaseOnly: false,
        shouldBlendWithWebSearch: false,
        shouldFallbackToWebSearch: true,
        confidence: "low",
        reason: "top_score_below_threshold",
      }
    }

    if (
      highConfidenceCount >= highConfidenceMinCount ||
      (topScore >= highConfidenceMinScore && secondScore >= minScore)
    ) {
      return {
        shouldUseKnowledgeBaseOnly: true,
        shouldBlendWithWebSearch: false,
        shouldFallbackToWebSearch: false,
        confidence: "high",
        reason: "multiple_high_confidence_knowledge_base_hits",
      }
    }

    if (relevantCount === 1 && topScore < hybridBlendMaxScore) {
      return {
        shouldUseKnowledgeBaseOnly: false,
        shouldBlendWithWebSearch: true,
        shouldFallbackToWebSearch: false,
        confidence: "low",
        reason: "single_low_confidence_hit_requires_web_blending",
      }
    }

    if (relevantCount >= 1 && topScore >= useOnlyMinScore) {
      return {
        shouldUseKnowledgeBaseOnly: true,
        shouldBlendWithWebSearch: false,
        shouldFallbackToWebSearch: false,
        confidence: "medium",
        reason: "top_hit_above_threshold",
      }
    }

    try {
      const response =
        await this.llmClientRepository.getClient().chat.completions.create({
          model: this.llm.chatModel,
          messages: [
            {
              role: "system",
              content:
                "Judge whether the provided knowledge-base context is enough to answer the user's question. Reply with only one of: KNOWLEDGE_BASE, HYBRID, SEARCH.",
            },
            {
              role: "user",
              content: `Question:\n${question}\n\nKnowledge Base Context:\n${citations
                .map(
                  (citation, index) =>
                    `Source ${index + 1}:\nScore: ${citation.score}\nContent: ${citation.text}`,
                )
                .join("\n\n")}`,
            },
          ],
        })

      const verdict = response.choices[0]?.message?.content?.trim().toUpperCase()

      if (verdict === "KNOWLEDGE_BASE") {
        return {
          shouldUseKnowledgeBaseOnly: true,
          shouldBlendWithWebSearch: false,
          shouldFallbackToWebSearch: false,
          confidence: "medium",
          reason: "llm_routing_knowledge_base",
        }
      }

      if (verdict === "HYBRID") {
        return {
          shouldUseKnowledgeBaseOnly: false,
          shouldBlendWithWebSearch: true,
          shouldFallbackToWebSearch: false,
          confidence: "medium",
          reason: "llm_routing_hybrid",
        }
      }

      return {
        shouldUseKnowledgeBaseOnly: false,
        shouldBlendWithWebSearch: false,
        shouldFallbackToWebSearch: true,
        confidence: "medium",
        reason: "llm_routing_search",
      }
    } catch {
      return {
        shouldUseKnowledgeBaseOnly: topScore >= minScore,
        shouldBlendWithWebSearch:
          topScore >= minScore && topScore < hybridBlendMaxScore,
        shouldFallbackToWebSearch: topScore < minScore,
        confidence: "low",
        reason: "rule_fallback_after_llm_error",
      }
    }
  }
}
