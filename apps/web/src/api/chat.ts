import type {
  CreateConversationResponse,
  DeleteConversationResponse,
  GetConversationMessagesResponse,
  ListConversationsResponse,
  RagAskRequest,
  RagAskResponse,
  UpdateConversationTitleResponse,
} from "@assistant/shared"
import type { AxiosRequestConfig } from "axios"
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

export async function updateConversationTitle(
  conversationId: string,
  question: string,
) {
  return http.request<UpdateConversationTitleResponse | null>({
    method: "PATCH",
    url: `/chat/conversations/${conversationId}/title`,
    data: { question },
  })
}

export async function deleteConversation(conversationId: string) {
  return http.request<DeleteConversationResponse>({
    method: "DELETE",
    url: `/chat/conversations/${conversationId}`,
  })
}

export async function getConversationMessages(conversationId: string) {
  return http.get<GetConversationMessagesResponse>(
    `/chat/conversations/${conversationId}/messages`,
  )
}

export async function askRagQuestion(
  payload: RagAskRequest,
  config?: AxiosRequestConfig,
) {
  return http.post<RagAskResponse>("/rag/ask", payload, config)
}
