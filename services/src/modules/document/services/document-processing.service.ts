import { Inject, Injectable } from "@nestjs/common"
import type {
  DocumentChunkRecord,
  DocumentEmbeddingRecord,
  DocumentProcessingEvent,
  DocumentProcessingManifest,
} from "@assistant/shared"
import { DocumentEventsService } from "./document-events.service"
import { DocumentParseService } from "./document-parse.service"
import { DocumentVectorizeService } from "./document-vectorize.service"
import {
  DOCUMENT_REPOSITORY,
  type DocumentRepository,
} from "../ports/document.repository.port"
import {
  DOCUMENT_ARTIFACT_REPOSITORY,
  type DocumentArtifactRepository,
} from "../ports/document-artifact.repository.port"

@Injectable()
export class DocumentProcessingService {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly repository: DocumentRepository,
    @Inject(DOCUMENT_ARTIFACT_REPOSITORY)
    private readonly artifacts: DocumentArtifactRepository,
    private readonly parser: DocumentParseService,
    private readonly vectorizer: DocumentVectorizeService,
    private readonly events: DocumentEventsService,
  ) {}

  async process(documentId: string) {
    try {
      const current = await this.repository.update(documentId, {
        status: "processing",
        progress: 15,
      })

      // 第 1 阶段：解析前先记录状态，让 SSE 能立即反馈进度。
      await this.emit(
        documentId,
        "parsing",
        25,
        "开始解析文档",
        `文件：${current.originalName}`,
      )

      const parsed = await this.parser.parse(current)
      await this.artifacts.saveChunks(documentId, parsed.chunks)

      // 第 2 阶段：完成文本分块后，再把分块结果写入数据库。
      await this.emit(
        documentId,
        "parsing",
        45,
        "文档解析完成",
        parsed.sourceText
          ? `已提取 ${parsed.sourceText.length} 个字符`
          : "当前格式暂未做深度解析，使用标题/文件名构建基础分块",
      )

      await this.emit(
        documentId,
        "chunking",
        65,
        "完成分块",
        `分块数量：${parsed.chunks.length}`,
      )

      await this.emit(
        documentId,
        "vectorizing",
        80,
        "开始向量化",
        "使用本地哈希向量器生成嵌入",
      )
      const embeddings = await this.vectorizer.vectorize(
        documentId,
        parsed.chunks,
      )
      await this.artifacts.saveEmbeddings(documentId, embeddings)

      const manifest: DocumentProcessingManifest = {
        documentId,
        sourceFileName: current.originalName,
        parser: parsed.parser,
        vectorizer: embeddings[0]?.model ?? "text-embedding-v4",
        chunkCount: parsed.chunks.length,
        embeddingCount: embeddings.length,
        updatedAt: new Date().toISOString(),
      }

      // 第 3 阶段：向量化完成后更新最终状态，供查询接口直接读取。
      await this.emit(
        documentId,
        "vectorizing",
        95,
        "向量化完成",
        `向量数量：${manifest.embeddingCount}`,
      )

      const completed = await this.repository.update(documentId, {
        status: "completed",
        progress: 100,
      })

      await this.emit(
        documentId,
        "completed",
        100,
        "文档处理完成",
        `状态：${completed.status}`,
      )
      return completed
    } catch (error) {
      const message = error instanceof Error ? error.message : "文档处理失败"
      await this.repository.update(documentId, {
        status: "failed",
        errorMessage: message,
        progress: 100,
      })
      await this.emit(documentId, "failed", 100, "文档处理失败", message)
      throw error
    }
  }

  async rebuildIndex(documentId: string) {
    try {
      const current = await this.repository.update(documentId, {
        status: "processing",
        progress: 70,
      })

      await this.emit(
        documentId,
        "reindexing",
        75,
        "开始重建索引",
        `文件：${current.originalName}`,
      )

      const chunks = await this.artifacts.listChunks(documentId)
      const embeddings = await this.vectorizer.vectorize(documentId, chunks)

      await this.artifacts.saveEmbeddings(documentId, embeddings)

      await this.emit(
        documentId,
        "reindexing",
        95,
        "索引重建完成",
        `向量数量：${embeddings.length}`,
      )

      const completed = await this.repository.update(documentId, {
        status: "completed",
        progress: 100,
      })

      await this.emit(
        documentId,
        "completed",
        100,
        "索引重建完成",
        `状态：${completed.status}`,
      )

      return completed
    } catch (error) {
      const message = error instanceof Error ? error.message : "索引重建失败"
      await this.repository.update(documentId, {
        status: "failed",
        errorMessage: message,
        progress: 100,
      })
      await this.emit(documentId, "failed", 100, "索引重建失败", message)
      throw error
    }
  }

  private async emit(
    documentId: string,
    stage: DocumentProcessingEvent["stage"],
    progress: number,
    message: string,
    detail?: string,
  ) {
    await this.events.emit({
      documentId,
      stage,
      progress,
      message,
      detail,
      timestamp: new Date().toISOString(),
    })
    await this.repository.update(documentId, { progress })
  }
}
