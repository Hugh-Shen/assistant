import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common"
import { extname } from "node:path"
import type { Express } from "express"
import { SUPPORTED_DOCUMENT_EXTENSIONS } from "@assistant/shared"

@Injectable()
export class DocumentFileValidationPipe
  implements PipeTransform<Express.Multer.File | undefined, Express.Multer.File>
{
  transform(file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException({
        message: "file is required",
        errorCode: "DOCUMENT_FILE_REQUIRED",
      })
    }

    if (!file.originalname || !file.originalname.trim()) {
      throw new BadRequestException({
        message: "file original name is required",
        errorCode: "DOCUMENT_FILE_NAME_REQUIRED",
      })
    }

    if (!file.size) {
      throw new BadRequestException({
        message: "file is empty",
        errorCode: "DOCUMENT_FILE_EMPTY",
      })
    }

    const extension = extname(file.originalname).toLowerCase()
    if (extension && !SUPPORTED_DOCUMENT_EXTENSIONS.has(extension)) {
      throw new BadRequestException({
        message: `unsupported document extension: ${extension}`,
        errorCode: "DOCUMENT_FILE_EXTENSION_UNSUPPORTED",
      })
    }

    return file
  }
}
