import type { ChatConversation, ChatMessageRecord } from "@assistant/shared"

export const CHAT_REPOSITORY = Symbol("CHAT_REPOSITORY")

export interface ChatRepository {
  createConversation(title: string): Promise<ChatConversation>
  listConversations(): Promise<ChatConversation[]>
  findConversationById(conversationId: string): Promise<ChatConversation | null>
  updateConversationTitle(
    conversationId: string,
    title: string,
  ): Promise<ChatConversation>
  deleteConversation(conversationId: string): Promise<void>
  createMessage(
    conversationId: string,
    role: ChatMessageRecord["role"],
    content: string,
  ): Promise<ChatMessageRecord>
  listMessages(conversationId: string): Promise<ChatMessageRecord[]>
}
