import type { RagCitation, RagRetrievalMode } from "@assistant/shared"
import type { KnowledgeBaseRoutingDecision } from "../../chains/types/knowledge-base-routing-decision"

export interface HybridRetrievalResult {
  retrievalMode: RagRetrievalMode
  routingReason: string
  citations: RagCitation[]
  knowledgeBaseCitations: RagCitation[]
  webCitations: RagCitation[]
}

export interface RetrievalResolutionContext {
  routing: KnowledgeBaseRoutingDecision
  needsWebSearch: boolean
  searchAvailable: boolean
  knowledgeBaseCitations: RagCitation[]
  webCitations: RagCitation[]
}
