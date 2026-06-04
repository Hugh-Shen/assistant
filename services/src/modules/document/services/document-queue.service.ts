import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common"
import { ConfigType } from "@nestjs/config"
import { Queue } from "bullmq"
import { DOCUMENT_QUEUE_NAME } from "@assistant/shared"
import { documentConfig } from "../../../config"

interface DocumentJobPayload {
  documentId: string
}

@Injectable()
export class DocumentQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(DocumentQueueService.name)
  private queue?: Queue<DocumentJobPayload>

  constructor(
    @Inject(documentConfig.KEY)
    private readonly config: ConfigType<typeof documentConfig>,
  ) {}

  private getQueue() {
    if (!this.config.redisUrl) {
      return undefined
    }

    if (!this.queue) {
      this.queue = new Queue(DOCUMENT_QUEUE_NAME, {
        connection: {
          url: this.config.redisUrl,
        },
      })
      this.logger.log("Document queue connected")
    }

    return this.queue
  }

  async enqueue(documentId: string) {
    const queue = this.getQueue()    

    if (!queue) {
      throw new Error("REDIS_URL is required to enqueue document jobs")
    }

    const job = await queue.add(
      "process-document",
      { documentId },
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    )

    return job.id ?? documentId
  }

  async enqueueRebuild(documentId: string) {
    const queue = this.getQueue()

    if (!queue) {
      throw new Error("REDIS_URL is required to enqueue document jobs")
    }

    const job = await queue.add(
      "rebuild-document-index",
      { documentId },
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    )

    return job.id ?? documentId
  }

  async close() {
    await this.queue?.close()
  }

  async onModuleDestroy() {
    await this.close()
  }
}
