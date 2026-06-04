import { IsUUID } from "class-validator"

export class DocumentIdParamDto {
  @IsUUID()
  id!: string
}
