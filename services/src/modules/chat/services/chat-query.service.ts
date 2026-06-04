import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import type {
  CreateConversationResponse,
  GetConversationMessagesResponse,
  ListConversationsResponse,
} from "@assistant/shared"
import { CHAT_REPOSITORY, type ChatRepository } from "../ports/chat.repository.port"

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
