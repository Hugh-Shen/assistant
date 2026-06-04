import {
  Injectable,
  Inject,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common"
import { ConfigType } from "@nestjs/config"
import { Worker } from "bullmq"
import { DOCUMENT_QUEUE_NAME } from "@assistant/shared"
import { documentConfig } from "../../../config"
import { DocumentProcessingService } from "./document-processing.service"

interface DocumentJobPayload {
  documentId: string
}

@Injectable()
export class DocumentWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DocumentWorkerService.name)
  private worker?: Worker<DocumentJobPayload>

  constructor(
    private readonly processor: DocumentProcessingService,
    @Inject(documentConfig.KEY)
    private readonly config: ConfigType<typeof documentConfig>,
  ) {}

  async onModuleInit() {
    if (!this.config.redisUrl) {
      this.logger.warn("REDIS_URL not set, worker service will stay idle")
      return
    }

    const connection = {
      url: this.config.redisUrl,
    }

    this.worker = new Worker(
      DOCUMENT_QUEUE_NAME,
      async job => {
        if (job.name === "rebuild-document-index") {
          return this.processor.rebuildIndex(job.data.documentId)
        }

        return this.processor.process(job.data.documentId)
      },
      { connection },
    )

    this.worker.on("completed", job => {
      this.logger.log(`Document job completed: ${job?.id ?? "unknown"}`)
    })

    this.worker.on("failed", (job, error) => {
      this.logger.error(
        `Document job failed: ${job?.id ?? "unknown"}`,
        error?.stack,
      )
    })
  }

  async onModuleDestroy() {
    await this.worker?.close()
  }
}
