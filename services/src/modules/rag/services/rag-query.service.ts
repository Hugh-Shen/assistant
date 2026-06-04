import { Injectable } from "@nestjs/common"
import type { RagAskResponse } from "@assistant/shared"
import { Inject } from "@nestjs/common"
import { AnswerGenerationService } from "../../../langchain/chains/answer-generation.service"
import { PgvectorRetrieverService } from "../../../langchain/retrievers/pgvector-retriever.service"
import { CHAT_REPOSITORY, type ChatRepository } from "../../chat/ports/chat.repository.port"

@Injectable()
export class RagQueryService {
  constructor(
    private readonly retriever: PgvectorRetrieverService,
    private readonly answerGeneration: AnswerGenerationService,
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: ChatRepository,
  ) {}

  async ask(
    question: string,
    topK = 4,
    conversationId?: string,
  ): Promise<RagAskResponse> {
    const citations = await this.retriever.search(question, topK)
    const history = conversationId
      ? await this.chatRepository.listMessages(conversationId)
      : []
    const answer = await this.answerGeneration.answer(question, citations, history)

    if (conversationId) {
      await this.chatRepository.createMessage(conversationId, "user", question)
      await this.chatRepository.createMessage(conversationId, "assistant", answer)
    }

    return {
      question,
      answer,
      citations,
    }
  }
}
