export interface KnowledgeBaseRoutingDecision {
  shouldUseKnowledgeBaseOnly: boolean
  shouldBlendWithWebSearch: boolean
  shouldFallbackToWebSearch: boolean
  confidence: "high" | "medium" | "low"
  reason: string
}
