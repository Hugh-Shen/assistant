import type OpenAI from "openai"

export const LLM_CLIENT_REPOSITORY = Symbol("LLM_CLIENT_REPOSITORY")

export interface LlmClientRepository {
  getClient(): OpenAI
}
