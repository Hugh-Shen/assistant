import type {
  CreateConversationResponse,
  GetConversationMessagesResponse,
  ListConversationsResponse,
  RagAskRequest,
  RagAskResponse,
} from "@assistant/shared"
import { http } from "@/lib/http"

export async function listConversations() {
  return http.get<ListConversationsResponse>(
    "/chat/conversations",
  )
}

export async function createConversation(title?: string) {
  return http.post<CreateConversationResponse>(
    "/chat/conversations",
    { title },
  )
}

export async function getConversationMessages(conversationId: string) {
  return http.get<GetConversationMessagesResponse>(
    `/chat/conversations/${conversationId}/messages`,
  )
}

export async function askRagQuestion(payload: RagAskRequest) {
  return http.post<RagAskResponse>("/rag/ask", payload)
}
