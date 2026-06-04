import { Injectable } from "@nestjs/common"
import { readFile } from "node:fs/promises"
import { extname, resolve } from "node:path"
import type { DocumentChunkRecord, DocumentRecord } from "@assistant/shared"

@Injectable()
export class DocumentParseService {
  /**
   * Parses the original document file into plain text and deterministic chunks.
   * The returned chunks are the canonical source for downstream vectorization.
   */
  async parse(document: DocumentRecord) {
    const sourceText = await this.extractText(document.storagePath, document.mimeType)
    const normalizedText = sourceText || document.title || document.originalName
    const chunks = this.chunkText(normalizedText, document.id)

    return {
      parser: "local-text-parser",
      sourceText,
      chunks,
    }
  }

  private async extractText(storagePath: string, mimeType: string) {
    const absolutePath = resolve(process.cwd(), storagePath)
    const extension = extname(absolutePath).toLowerCase()
    const isPlainTextLike =
      mimeType.startsWith("text/") ||
      extension === ".md" ||
      extension === ".markdown" ||
      extension === ".html" ||
      extension === ".htm" ||
      extension === ".txt"

    if (!isPlainTextLike) {
      return ""
    }

    return readFile(absolutePath, "utf8")
  }

  private chunkText(text: string, documentId: string): DocumentChunkRecord[] {
    const normalized = text.trim()

    if (!normalized) {
      return []
    }

    const chunkSize = 1200
    const overlap = 120
    const chunks: DocumentChunkRecord[] = []

    let cursor = 0
    let chunkIndex = 0

    while (cursor < normalized.length) {
      const endOffset = Math.min(cursor + chunkSize, normalized.length)
      const chunkText = normalized.slice(cursor, endOffset)
      const words = chunkText.trim().split(/\s+/).filter(Boolean)

      chunks.push({
        id: `${documentId}-chunk-${chunkIndex + 1}`,
        documentId,
        index: chunkIndex,
        text: chunkText,
        characterCount: chunkText.length,
        tokenCount: words.length,
        startOffset: cursor,
        endOffset,
      })

      cursor += chunkSize - overlap
      chunkIndex += 1
    }

    return chunks
  }
}
