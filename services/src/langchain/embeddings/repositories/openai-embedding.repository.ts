import { Inject, Injectable } from "@nestjs/common"
import { ConfigType } from "@nestjs/config"
import { databaseConfig, llmConfig } from "../../../config"
import type { EmbeddingResult, EmbeddingService } from "../ports/embedding.port"
import {
  LLM_CLIENT_REPOSITORY,
  type LlmClientRepository,
} from "../../shared/ports/llm-client.port"

function normalizeVectorDimension(vector: number[], dimension: number) {
  if (vector.length === dimension) {
    return vector
  }

  if (vector.length > dimension) {
    return vector.slice(0, dimension)
  }

  return [...vector, ...new Array(dimension - vector.length).fill(0)]
}

@Injectable()
export class OpenAiEmbeddingRepository implements EmbeddingService {
  constructor(
    @Inject(LLM_CLIENT_REPOSITORY)
    private readonly llmClientRepository: LlmClientRepository,
    @Inject(llmConfig.KEY)
    private readonly config: ConfigType<typeof llmConfig>,
    @Inject(databaseConfig.KEY)
    private readonly database: ConfigType<typeof databaseConfig>,
  ) {}

  async embed(text: string): Promise<EmbeddingResult> {
    const response =
      await this.llmClientRepository.getClient().embeddings.create({
      model: this.config.embeddingModel,
      input: text,
    })

    const item = response.data[0]

    if (!item) {
      throw new Error("OpenAI embedding response did not include vector data")
    }

    return {
      model: response.model,
      vector: normalizeVectorDimension(
        item.embedding,
        this.database.documentEmbeddingDimension,
      ),
    }
  }
}
