import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import type {
  CreateConversationResponse,
  DeleteConversationResponse,
  GetConversationMessagesResponse,
  ListConversationsResponse,
  UpdateConversationTitleResponse,
} from "@assistant/shared"
import { CHAT_REPOSITORY, type ChatRepository } from "../ports/chat.repository.port"

function buildConversationTitle(question: string) {
  const normalized = question.trim().replace(/\s+/g, " ")

  if (!normalized) {
    return "新会话"
  }

  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized
}

@Injectable()
export class ChatQueryService {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly repository: ChatRepository,
  ) {}

  async createConversation(title?: string): Promise<CreateConversationResponse> {
    const conversation = await this.repository.createConversation(
      title?.trim() || "新会话",
    )

    return { conversation }
  }

  async deleteConversation(
    conversationId: string,
  ): Promise<DeleteConversationResponse> {
    const conversation = await this.repository.findConversationById(conversationId)

    if (!conversation) {
      throw new NotFoundException(`Conversation not found: ${conversationId}`)
    }

    await this.repository.deleteConversation(conversationId)

    return {
      conversationId,
    }
  }

  async ensureConversationTitle(
    conversationId: string,
    question: string,
  ): Promise<UpdateConversationTitleResponse | null> {
    const conversation = await this.repository.findConversationById(conversationId)

    if (!conversation) {
      throw new NotFoundException(`Conversation not found: ${conversationId}`)
    }

    if (conversation.title !== "新会话") {
      return null
    }

    const updated = await this.repository.updateConversationTitle(
      conversationId,
      buildConversationTitle(question),
    )

    return { conversation: updated }
  }

  async listConversations(): Promise<ListConversationsResponse> {
    const conversations = await this.repository.listConversations()
    return { conversations }
  }

  async getConversationMessages(
    conversationId: string,
  ): Promise<GetConversationMessagesResponse> {
    const conversation = await this.repository.findConversationById(conversationId)

    if (!conversation) {
      throw new NotFoundException(`Conversation not found: ${conversationId}`)
    }

    const messages = await this.repository.listMessages(conversationId)

    return {
      conversation,
      messages,
    }
  }
}
