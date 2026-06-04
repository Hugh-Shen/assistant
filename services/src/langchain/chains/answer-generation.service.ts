import { Inject, Injectable } from "@nestjs/common"
import { ConfigType } from "@nestjs/config"
import OpenAI from "openai"
import type { ChatMessageRecord, RagCitation } from "@assistant/shared"
import { llmConfig } from "../../config"

@Injectable()
export class AnswerGenerationService {
  private readonly client: OpenAI

  constructor(
    @Inject(llmConfig.KEY)
    private readonly config: ConfigType<typeof llmConfig>,
  ) {
    this.client = new OpenAI({
      apiKey: this.config.openaiApiKey,
      baseURL: this.config.openaiApiBaseUrl || undefined,
    })
  }

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
          `Source ${index + 1}:\nDocument: ${item.documentId}\nChunk: ${item.chunkId}\nContent: ${item.text}`,
      )
      .join("\n\n")

    const response = await this.client.chat.completions.create({
      model: this.config.chatModel,
      messages: [
        {
          role: "system",
          content:
            "You are a retrieval-augmented assistant. Answer with the provided context only when possible. If the context is insufficient, say so plainly.",
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
}
