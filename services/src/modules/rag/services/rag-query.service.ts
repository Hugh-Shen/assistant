import { Injectable } from "@nestjs/common"
import type { RagAskResponse } from "@assistant/shared"
import { Inject } from "@nestjs/common"
import { Observable } from "rxjs"
import { AnswerGenerationService } from "../../../langchain/chains/answer-generation.service"
import { HybridRetrieverService } from "../../../langchain/retrievers/hybrid-retriever.service"
import { CHAT_REPOSITORY, type ChatRepository } from "../../chat/ports/chat.repository.port"
import { ChatQueryService } from "../../chat/services/chat-query.service"

@Injectable()
export class RagQueryService {
  constructor(
    private readonly retriever: HybridRetrieverService,
    private readonly answerGeneration: AnswerGenerationService,
    private readonly chatQueryService: ChatQueryService,
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: ChatRepository,
  ) {}

  async ask(
    question: string,
    topK = 4,
    conversationId?: string,
  ): Promise<RagAskResponse> {
    const retrieval = await this.retriever.retrieve(question, topK)
    const history = conversationId
      ? await this.chatRepository.listMessages(conversationId)
      : []
    const answer = await this.answerGeneration.answer(
      question,
      retrieval.citations,
      retrieval.retrievalMode,
      history,
    )

    if (conversationId) {
      await this.chatQueryService.ensureConversationTitle(conversationId, question)
      await this.chatRepository.createMessage(conversationId, "user", question)
      await this.chatRepository.createMessage(conversationId, "assistant", answer)
    }

    return {
      question,
      answer,
      retrievalMode: retrieval.retrievalMode,
      routingReason: retrieval.routingReason,
      citations: retrieval.citations,
    }
  }

  async askStream(
    question: string,
    topK = 4,
    conversationId?: string,
  ): Promise<{
    initial: Omit<RagAskResponse, "answer">
    stream: Observable<string>
    persist: (answer: string) => Promise<void>
  }> {
    const retrieval = await this.retriever.retrieve(question, topK)
    const history = conversationId
      ? await this.chatRepository.listMessages(conversationId)
      : []

    return {
      initial: {
        question,
        retrievalMode: retrieval.retrievalMode,
        routingReason: retrieval.routingReason,
        citations: retrieval.citations,
      },
      stream: this.answerGeneration.streamAnswer(
        question,
        retrieval.citations,
        retrieval.retrievalMode,
        history,
      ),
      persist: async (answer: string) => {
        if (!conversationId) {
          return
        }

        await this.chatQueryService.ensureConversationTitle(conversationId, question)
        await this.chatRepository.createMessage(conversationId, "user", question)
        await this.chatRepository.createMessage(
          conversationId,
          "assistant",
          answer,
        )
      },
    }
  }
}
