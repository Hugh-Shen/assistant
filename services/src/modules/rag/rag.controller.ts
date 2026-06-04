import { Body, Controller, Post, UseInterceptors } from "@nestjs/common"
import { createResponseEnvelope, NegotiatedResponseInterceptor } from "../../common/http"
import { RagAskRequestDto } from "./dto/rag-ask.request.dto"
import { RagQueryService } from "./services/rag-query.service"

@Controller("rag")
export class RagController {
  constructor(private readonly ragQueryService: RagQueryService) {}

  @Post("ask")
  @UseInterceptors(NegotiatedResponseInterceptor)
  async ask(@Body() body: RagAskRequestDto) {
    const response = await this.ragQueryService.ask(
      body.question,
      body.topK,
      body.conversationId,
    )

    return createResponseEnvelope(response)
  }
}
