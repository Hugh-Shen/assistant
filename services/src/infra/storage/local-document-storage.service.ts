import { Injectable } from "@nestjs/common"
import { Inject } from "@nestjs/common"
import { ConfigType } from "@nestjs/config"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, extname, join, resolve } from "node:path"
import type { Express } from "express"
import { documentConfig } from "../../config"

@Injectable()
export class LocalDocumentStorageService {
  constructor(
    @Inject(documentConfig.KEY)
    private readonly config: ConfigType<typeof documentConfig>,
  ) {}

  private sanitizeFileName(fileName: string) {
    const extension = extname(fileName)
    const baseName = fileName
      .slice(0, fileName.length - extension.length)
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")

    return `${baseName || "document"}${extension || ".bin"}`
  }

  async save(documentId: string, file: Express.Multer.File) {
    const safeFileName = this.sanitizeFileName(file.originalname)
    const storagePath = join("storage", "documents", documentId, "source", safeFileName)
    const absolutePath = resolve(process.cwd(), storagePath)

    await mkdir(dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, file.buffer)

    return {
      storagePath,
      absolutePath,
    }
  }

  getDocumentArtifactsDir(documentId: string) {
    return resolve(process.cwd(), this.config.storageRoot, documentId, "artifacts")
  }
}
