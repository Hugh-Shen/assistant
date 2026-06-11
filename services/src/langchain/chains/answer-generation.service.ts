import { Inject, Injectable } from "@nestjs/common"
import { ConfigType } from "@nestjs/config"
import type {
  ChatMessageRecord,
  RagCitation,
  RagRetrievalMode,
} from "@assistant/shared"
import { Observable } from "rxjs"
import { llmConfig } from "../../config"
import { buildRagAnswerPrompt } from "../prompts/rag-answer.prompt"
import {
  LLM_CLIENT_REPOSITORY,
  type LlmClientRepository,
} from "../shared/ports/llm-client.port"

@Injectable()
export class AnswerGenerationService {
  private static readonly NO_CONTEXT_FALLBACK_ANSWER =
    "抱歉，我暂时不知道这个问题的答案。"

  constructor(
    @Inject(LLM_CLIENT_REPOSITORY)
    private readonly llmClientRepository: LlmClientRepository,
    @Inject(llmConfig.KEY)
    private readonly config: ConfigType<typeof llmConfig>,
  ) {}

  async answer(
    question: string,
    citations: RagCitation[],
    retrievalMode: RagRetrievalMode,
    history: ChatMessageRecord[] = [],
  ) {
    const prompt = buildRagAnswerPrompt({
      question,
      citations,
      retrievalMode,
      history,
    })

    const fallbackAnswer = this.getFallbackAnswer(retrievalMode, citations)

    if (fallbackAnswer) {
      return fallbackAnswer
    }

    const response =
      await this.llmClientRepository.getClient().chat.completions.create({
        model: this.config.chatModel,
        messages: [
          {
            role: "system",
            content: prompt.system,
          },
          {
            role: "user",
            content: prompt.user,
          },
        ],
      })

    const output = response.choices[0]?.message?.content?.trim()

    if (!output) {
      throw new Error("Chat completion response did not include answer text")
    }

    return output
  }

  streamAnswer(
    question: string,
    citations: RagCitation[],
    retrievalMode: RagRetrievalMode,
    history: ChatMessageRecord[] = [],
  ): Observable<string> {
    return new Observable<string>(subscriber => {
      const controller = new AbortController()
      const fallbackAnswer = this.getFallbackAnswer(retrievalMode, citations)

      if (fallbackAnswer) {
        subscriber.next(fallbackAnswer)
        subscriber.complete()
        return () => undefined
      }

      const prompt = buildRagAnswerPrompt({
        question,
        citations,
        retrievalMode,
        history,
      })

      void (async () => {
        try {
          const stream =
            await this.llmClientRepository.getClient().chat.completions.create(
              {
                model: this.config.chatModel,
                stream: true,
                messages: [
                  {
                    role: "system",
                    content: prompt.system,
                  },
                  {
                    role: "user",
                    content: prompt.user,
                  },
                ],
              },
              {
                signal: controller.signal,
              },
            )

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content

            if (!delta) {
              continue
            }

            subscriber.next(delta)
          }

          subscriber.complete()
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)

          if (message.toLowerCase().includes("aborted")) {
            subscriber.complete()
            return
          }

          subscriber.error(error)
        }
      })()

      return () => {
        controller.abort()
      }
    })
  }

  private getFallbackAnswer(
    retrievalMode: RagRetrievalMode,
    citations: RagCitation[],
  ) {
    if (retrievalMode === "none") {
      return AnswerGenerationService.NO_CONTEXT_FALLBACK_ANSWER
    }

    if (
      (retrievalMode === "search" || retrievalMode === "hybrid") &&
      citations.length === 0
    ) {
      return AnswerGenerationService.NO_CONTEXT_FALLBACK_ANSWER
    }

    return null
  }
}
