import { Transform } from "class-transformer"
import { IsOptional, IsString, MaxLength } from "class-validator"

export class UploadDocumentRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  title?: string
}
