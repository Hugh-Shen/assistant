import { Injectable } from "@nestjs/common"
import { randomUUID } from "node:crypto"
import type { ChatConversation, ChatMessageRecord } from "@assistant/shared"
import { PrismaService } from "../../../infra/db/prisma.service"
import type { ChatRepository } from "../ports/chat.repository.port"

function rowToConversation(record: {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}): ChatConversation {
  return {
    id: record.id,
    title: record.title,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function rowToMessage(record: {
  id: string
  conversationId: string
  role: string
  content: string
  createdAt: Date
}): ChatMessageRecord {
  return {
    id: record.id,
    conversationId: record.conversationId,
    role: record.role as ChatMessageRecord["role"],
    content: record.content,
    createdAt: record.createdAt.toISOString(),
  }
}

@Injectable()
export class PrismaChatRepository implements ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(title: string) {
    const now = new Date()
    const created = await this.prisma.chatConversation.create({
      data: {
        id: randomUUID(),
        title,
        createdAt: now,
        updatedAt: now,
      },
    })

    return rowToConversation(created)
  }

  async listConversations() {
    const rows = await this.prisma.chatConversation.findMany({
      orderBy: { updatedAt: "desc" },
    })

    return rows.map(rowToConversation)
  }

  async findConversationById(conversationId: string) {
    const row = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    })

    return row ? rowToConversation(row) : null
  }

  async updateConversationTitle(conversationId: string, title: string) {
    const updated = await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        title,
        updatedAt: new Date(),
      },
    })

    return rowToConversation(updated)
  }

  async deleteConversation(conversationId: string) {
    await this.prisma.chatConversation.delete({
      where: { id: conversationId },
    })
  }

  async createMessage(conversationId: string, role: ChatMessageRecord["role"], content: string) {
    const created = await this.prisma.chatMessage.create({
      data: {
        id: randomUUID(),
        conversationId,
        role,
        content,
        createdAt: new Date(),
      },
    })

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
      },
    })

    return rowToMessage(created)
  }

  async listMessages(conversationId: string) {
    const rows = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    })

    return rows.map(rowToMessage)
  }
}
