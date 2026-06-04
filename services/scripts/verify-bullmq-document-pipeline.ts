import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import type { Express } from "express"
import { AppModule } from "../src/app.module"
import { WorkerModule } from "../src/worker/worker.module"
import { DocumentUploadService } from "../src/modules/document/services/document-upload.service"
import { DocumentArtifactQueryService } from "../src/modules/document/services/document-artifact-query.service"
import { DocumentQueryService } from "../src/modules/document/services/document-query.service"

async function main() {
  const workerApp = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["error", "warn", "log"],
  })
  const apiApp = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  })

  try {
    const upload = apiApp.get(DocumentUploadService)
    const artifacts = apiApp.get(DocumentArtifactQueryService)
    const documents = apiApp.get(DocumentQueryService)

    const content = [
      "# BullMQ Pipeline Verification",
      "",
      "This document validates the async upload -> queue -> worker -> pgvector flow.",
      "The worker should consume the queued job and finish persistence.",
    ].join("\n")

    const buffer = Buffer.from(content, "utf8")
    const file = {
      fieldname: "file",
      originalname: "bullmq-check.md",
      encoding: "7bit",
      mimetype: "text/markdown",
      size: buffer.length,
      buffer,
    } as Express.Multer.File

    const result = await upload.upload(file, { title: "BullMQ Verification" })
    const documentId = result.document.id

    const startedAt = Date.now()
    let completed = false
    let finalStatus = result.document.status

    while (Date.now() - startedAt < 20_000) {
      const [document, manifest] = await Promise.all([
        documents.getDocument(documentId),
        artifacts.getManifest(documentId),
      ])
      finalStatus = document.status

      if (document.status === "completed" && manifest.embeddingCount > 0) {
        completed = true
        break
      }

      if (document.status === "failed") {
        throw new Error(`Document processing failed: ${document.errorMessage ?? "unknown error"}`)
      }

      await new Promise(resolve => setTimeout(resolve, 500))
    }

    if (!completed) {
      throw new Error("Timed out waiting for BullMQ worker to finish document processing")
    }

    const [manifest, chunks, embeddings] = await Promise.all([
      artifacts.getManifest(documentId),
      artifacts.getChunks(documentId),
      artifacts.getEmbeddings(documentId),
    ])

    console.log(
      JSON.stringify(
        {
          documentId,
          status: finalStatus,
          eventsUrl: result.eventsUrl,
          manifest,
          chunkCount: chunks.length,
          embeddingCount: embeddings.length,
          vectorPreview: embeddings[0]?.vector.slice(0, 6) ?? [],
        },
        null,
        2,
      ),
    )
  } finally {
    await apiApp.close()
    await workerApp.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
