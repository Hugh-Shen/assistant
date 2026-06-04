import { IsInt, IsOptional, IsString, Max, Min } from "class-validator"

export class RagAskRequestDto {
  @IsString()
  question!: string

  @IsOptional()
  @IsString()
  conversationId?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  topK?: number
}
