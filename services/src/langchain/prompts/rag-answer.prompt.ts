import type {
  ChatMessageRecord,
  RagCitation,
  RagRetrievalMode,
} from "@assistant/shared"

const BASE_SYSTEM_PROMPT =
  "You are a retrieval-augmented assistant. Answer directly and concisely using the provided context. Preserve useful structure like paragraphs and bullet lists. Never bring unrelated facts from prior conversation into the current answer. Use conversation history only when it is necessary to resolve references in the current user question. First judge whether the provided context is actually relevant to the current question. If it is not relevant, do not summarize it, do not quote it, and do not list its topics."

const SEARCH_SYSTEM_PROMPT =
  "The answer is being generated from web search context. Focus on the current user question and the provided web context only. Ignore prior conversation if it is not directly relevant to the current question. Do not mention that the knowledge base lacks the answer unless the user explicitly asks about knowledge-base coverage. Do not add unnecessary disclaimers before the real answer. Do not mention irrelevant knowledge-base snippets at all."

const HYBRID_SYSTEM_PROMPT =
  "Use knowledge-base context when it is directly relevant, and use web context to fill missing facts. Ignore prior conversation content that is unrelated to the current question. Ignore any retrieved snippet that does not directly help answer the current question. Do not start the answer with statements like \"the knowledge base does not mention\" unless that contrast is essential to answering the user's question."

const KNOWLEDGE_BASE_SYSTEM_PROMPT =
  "Prefer knowledge-base context when it directly answers the question. If the provided context is genuinely insufficient or irrelevant to the question, answer briefly that you do not currently know or do not have enough information to answer. Do not enumerate or summarize unrelated knowledge-base content. Do not mention the knowledge base unless the user explicitly asks about it."

const NONE_SYSTEM_PROMPT =
  "There is no trustworthy context available for answering the current question. Reply briefly and naturally that you do not currently know or do not have enough information. Do not invent facts. Do not mention the knowledge base unless the user explicitly asks about it."

export interface RagAnswerPromptInput {
  question: string
  citations: RagCitation[]
  retrievalMode: RagRetrievalMode
  history?: ChatMessageRecord[]
}

export interface RagAnswerPrompt {
  system: string
  user: string
}

function formatHistory(history: ChatMessageRecord[] = []) {
  return history
    .slice(-6)
    .map(message => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n")
}

function formatCitations(citations: RagCitation[]) {
  return citations
    .map(
      (item, index) =>
        `Source ${index + 1}:\nType: ${item.sourceType}\nSource: ${item.source ?? "unknown"}\nTitle: ${item.title ?? item.documentId ?? "untitled"}\nURL: ${item.url ?? "n/a"}\nDocument: ${item.documentId ?? "n/a"}\nChunk: ${item.chunkId ?? "n/a"}\nContent: ${item.text}`,
    )
    .join("\n\n")
}

export function buildRagAnswerSystemPrompt(retrievalMode: RagRetrievalMode) {
  if (retrievalMode === "none") {
    return `${BASE_SYSTEM_PROMPT} ${NONE_SYSTEM_PROMPT}`
  }

  if (retrievalMode === "search") {
    return `${BASE_SYSTEM_PROMPT} ${SEARCH_SYSTEM_PROMPT}`
  }

  if (retrievalMode === "hybrid") {
    return `${BASE_SYSTEM_PROMPT} ${HYBRID_SYSTEM_PROMPT}`
  }

  return `${BASE_SYSTEM_PROMPT} ${KNOWLEDGE_BASE_SYSTEM_PROMPT}`
}

export function buildRagAnswerUserPrompt({
  question,
  citations,
  retrievalMode,
  history = [],
}: RagAnswerPromptInput) {
  const historyBlock = formatHistory(history)
  const context = formatCitations(citations)

  if (retrievalMode === "search") {
    return `Current Question:\n${question}\n\nWeb Context:\n${context}\n\nInstruction:\n1. Use only the current question and the provided web context.\n2. Ignore unrelated prior conversation.\n3. Do not mention unrelated knowledge-base topics.\n4. Answer the user's real question directly.`
  }

  if (retrievalMode === "none") {
    return `Current Question:\n${question}\n\nInstruction:\n1. There is no reliable context for answering this question.\n2. Reply briefly and naturally that you do not currently know or do not have enough information.\n3. Do not mention unrelated knowledge-base content.\n4. Do not mention the knowledge base unless the user explicitly asks about it.`
  }

  if (retrievalMode === "hybrid") {
    return `Conversation History:\n${historyBlock || "No prior history"}\n\nCurrent Question:\n${question}\n\nCombined Context:\n${context}\n\nInstruction:\n1. Use only the context that is directly relevant to the current question.\n2. Ignore unrelated conversation details.\n3. Ignore any retrieved snippet that does not help answer the question.\n4. If only the web context is relevant, answer from the web context directly without discussing unrelated knowledge-base content.`
  }

  return `Conversation History:\n${historyBlock || "No prior history"}\n\nCurrent Question:\n${question}\n\nKnowledge Base Context:\n${context}\n\nInstruction:\n1. First decide whether the provided knowledge-base context directly answers the current question.\n2. If yes, answer using only the relevant parts.\n3. If no, reply briefly and naturally that you do not currently know or do not have enough information.\n4. Do not summarize or list unrelated knowledge-base content.\n5. Do not mention the knowledge base unless the user explicitly asks about it.`
}

export function buildRagAnswerPrompt(
  input: RagAnswerPromptInput,
): RagAnswerPrompt {
  return {
    system: buildRagAnswerSystemPrompt(input.retrievalMode),
    user: buildRagAnswerUserPrompt(input),
  }
}
