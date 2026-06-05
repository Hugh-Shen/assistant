export interface ChatConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessageRecord {
  id: string
  conversationId: string
  role: "user" | "assistant"
  content: string
  createdAt: string
}

export interface CreateConversationResponse {
  conversation: ChatConversation
}

export interface DeleteConversationResponse {
  conversationId: string
}

export interface UpdateConversationTitleResponse {
  conversation: ChatConversation
}

export interface ListConversationsResponse {
  conversations: ChatConversation[]
}

export interface GetConversationMessagesResponse {
  conversation: ChatConversation
  messages: ChatMessageRecord[]
}
