import "reflect-metadata"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, relative } from "node:path"
import { randomUUID } from "node:crypto"
import { NestFactory } from "@nestjs/core"
import { WorkerModule } from "../src/worker/worker.module"
import { DocumentProcessingService } from "../src/modules/document/services/document-processing.service"
import {
  DOCUMENT_ARTIFACT_REPOSITORY,
  type DocumentArtifactRepository,
} from "../src/modules/document/repository/document-artifact.repository.port"
import {
  DOCUMENT_REPOSITORY,
  type DocumentRepository,
} from "../src/modules/document/repository/document.repository.port"

async function main() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["error", "warn", "log"],
  })

  try {
    const documents = app.get<DocumentRepository>(DOCUMENT_REPOSITORY)
    const artifacts = app.get<DocumentArtifactRepository>(
      DOCUMENT_ARTIFACT_REPOSITORY,
    )
    const processor = app.get(DocumentProcessingService)

    const documentId = randomUUID()
    const storagePath = `storage/documents/${documentId}/sample.md`
    const absolutePath = `${process.cwd()}/${storagePath}`
    const sampleContent = [
      "# Assistant Document Pipeline Verification",
      "",
      "This sample document validates the Prisma persistence flow.",
      "It should be parsed into chunks, converted into embeddings, and stored in pgvector.",
      "",
      "The verification should confirm:",
      "1. document metadata is written to documents",
      "2. chunk rows are written to document_chunks",
      "3. embedding rows are written to document_embeddings",
    ].join("\n")

    await mkdir(dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, sampleContent, "utf8")

    const now = new Date().toISOString()
    await documents.create({
      id: documentId,
      title: "Pipeline Verification",
      originalName: "sample.md",
      mimeType: "text/markdown",
      size: Buffer.byteLength(sampleContent, "utf8"),
      storagePath,
      status: "queued",
      progress: 0,
      createdAt: now,
      updatedAt: now,
    })

    const completed = await processor.process(documentId)
    const [chunks, embeddings] = await Promise.all([
      artifacts.listChunks(documentId),
      artifacts.listEmbeddings(documentId),
    ])

    const summary = {
      documentId,
      status: completed.status,
      progress: completed.progress,
      storagePath: relative(process.cwd(), absolutePath),
      chunkCount: chunks.length,
      embeddingCount: embeddings.length,
      embeddingDimension: embeddings[0]?.dimension ?? 0,
      vectorPreview: embeddings[0]?.vector.slice(0, 6) ?? [],
    }

    console.log(JSON.stringify(summary, null, 2))
  } finally {
    await app.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
