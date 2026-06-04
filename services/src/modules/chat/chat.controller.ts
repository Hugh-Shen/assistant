import { Body, Controller, Get, Param, Post, UseInterceptors } from "@nestjs/common"
import { createResponseEnvelope, NegotiatedResponseInterceptor } from "../../common/http"
import { ChatQueryService } from "./services/chat-query.service"

@Controller("chat")
export class ChatController {
  constructor(private readonly chatQueryService: ChatQueryService) {}

  @Get("conversations")
  @UseInterceptors(NegotiatedResponseInterceptor)
  async listConversations() {
    return createResponseEnvelope(await this.chatQueryService.listConversations())
  }

  @Post("conversations")
  @UseInterceptors(NegotiatedResponseInterceptor)
  async createConversation(@Body() body: { title?: string }) {
    return createResponseEnvelope(
      await this.chatQueryService.createConversation(body.title),
    )
  }

  @Get("conversations/:id/messages")
  @UseInterceptors(NegotiatedResponseInterceptor)
  async getConversationMessages(@Param("id") id: string) {
    return createResponseEnvelope(
      await this.chatQueryService.getConversationMessages(id),
    )
  }
}
