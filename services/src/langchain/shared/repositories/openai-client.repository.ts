import { Inject, Injectable } from "@nestjs/common"
import { ConfigType } from "@nestjs/config"
import OpenAI from "openai"
import { llmConfig } from "../../../config"
import type { LlmClientRepository } from "../ports/llm-client.port"

@Injectable()
export class OpenAiClientRepository implements LlmClientRepository {
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

  getClient() {
    return this.client
  }
}
