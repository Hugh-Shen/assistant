import { Inject, Injectable } from "@nestjs/common"
import { ConfigType } from "@nestjs/config"
import type { ChatMessageRecord, RagCitation } from "@assistant/shared"
import { Observable } from "rxjs"
import { llmConfig } from "../../config"
import {
  LLM_CLIENT_REPOSITORY,
  type LlmClientRepository,
} from "../shared/ports/llm-client.port"

@Injectable()
export class AnswerGenerationService {
  constructor(
    @Inject(LLM_CLIENT_REPOSITORY)
    private readonly llmClientRepository: LlmClientRepository,
    @Inject(llmConfig.KEY)
    private readonly config: ConfigType<typeof llmConfig>,
  ) {}

  async answer(
    question: string,
    citations: RagCitation[],
    history: ChatMessageRecord[] = [],
  ) {
    const historyBlock = history
      .map(message => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n")

    const context = citations
      .map(
        (item, index) =>
          `Source ${index + 1}:\nType: ${item.sourceType}\nSource: ${item.source ?? "unknown"}\nTitle: ${item.title ?? item.documentId ?? "untitled"}\nURL: ${item.url ?? "n/a"}\nDocument: ${item.documentId ?? "n/a"}\nChunk: ${item.chunkId ?? "n/a"}\nContent: ${item.text}`,
      )
      .join("\n\n")

    const response =
      await this.llmClientRepository.getClient().chat.completions.create({
      model: this.config.chatModel,
      messages: [
        {
          role: "system",
          content:
            "You are a retrieval-augmented assistant. Prefer knowledge-base context when it directly answers the question. Use web context when the knowledge base is insufficient. If neither context is enough, say so plainly.",
        },
        {
          role: "user",
          content: `Conversation History:\n${historyBlock || "No prior history"}\n\nQuestion:\n${question}\n\nContext:\n${context}`,
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
    history: ChatMessageRecord[] = [],
  ): Observable<string> {
    return new Observable<string>(subscriber => {
      const historyBlock = history
        .map(message => `${message.role.toUpperCase()}: ${message.content}`)
        .join("\n")

      const context = citations
        .map(
          (item, index) =>
            `Source ${index + 1}:\nType: ${item.sourceType}\nSource: ${item.source ?? "unknown"}\nTitle: ${item.title ?? item.documentId ?? "untitled"}\nURL: ${item.url ?? "n/a"}\nDocument: ${item.documentId ?? "n/a"}\nChunk: ${item.chunkId ?? "n/a"}\nContent: ${item.text}`,
        )
        .join("\n\n")

      const controller = new AbortController()

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
                    content:
                      "You are a retrieval-augmented assistant. Prefer knowledge-base context when it directly answers the question. Use web context when the knowledge base is insufficient. If neither context is enough, say so plainly.",
                  },
                  {
                    role: "user",
                    content: `Conversation History:\n${historyBlock || "No prior history"}\n\nQuestion:\n${question}\n\nContext:\n${context}`,
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
}
