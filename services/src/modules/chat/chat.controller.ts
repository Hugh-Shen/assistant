import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from "@nestjs/common"
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

  @Patch("conversations/:id/title")
  @UseInterceptors(NegotiatedResponseInterceptor)
  async updateConversationTitle(
    @Param("id") id: string,
    @Body() body: { question: string },
  ) {
    return createResponseEnvelope(
      await this.chatQueryService.ensureConversationTitle(id, body.question),
    )
  }

  @Get("conversations/:id/messages")
  @UseInterceptors(NegotiatedResponseInterceptor)
  async getConversationMessages(@Param("id") id: string) {
    return createResponseEnvelope(
      await this.chatQueryService.getConversationMessages(id),
    )
  }

  @Delete("conversations/:id")
  @UseInterceptors(NegotiatedResponseInterceptor)
  async deleteConversation(@Param("id") id: string) {
    return createResponseEnvelope(
      await this.chatQueryService.deleteConversation(id),
    )
  }
}
