import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Sse,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common"
import type { MessageEvent } from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { memoryStorage } from "multer"
import { map } from "rxjs"
import { DocumentIdParamDto } from "./dto/document-id.param.dto"
import { DocumentFileValidationPipe } from "./pipes/document-file-validation.pipe"
import { DocumentEventsService } from "./services/document-events.service"
import { DocumentArtifactQueryService } from "./services/document-artifact-query.service"
import { DocumentQueryService } from "./services/document-query.service"
import { DocumentQueueService } from "./services/document-queue.service"
import { DocumentUploadService } from "./services/document-upload.service"
import { UploadDocumentRequestDto } from "./dto/upload-document.request.dto"
import {
  createResponseEnvelope,
  NegotiatedResponseInterceptor,
} from "../../common/http"

@Controller("documents")
export class DocumentController {
  constructor(
    private readonly documentUploadService: DocumentUploadService,
    private readonly documentQueryService: DocumentQueryService,
    private readonly artifactQueryService: DocumentArtifactQueryService,
    private readonly documentQueueService: DocumentQueueService,
    private readonly events: DocumentEventsService,
  ) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
    }),
    NegotiatedResponseInterceptor,
  )
  async upload(
    @UploadedFile(new DocumentFileValidationPipe()) file: Express.Multer.File,
    @Body() body: UploadDocumentRequestDto,
  ): Promise<unknown> {
    const uploadResponse = await this.documentUploadService.upload(file, body)
    return createResponseEnvelope(uploadResponse, {
      initialEventName: "upload",
      stream: this.events
        .stream(uploadResponse.document.id)
        .pipe(
          map(event => ({
            type: event.stage,
            data: event,
          })),
        ),
    })
  }

  @Get()
  @UseInterceptors(NegotiatedResponseInterceptor)
  async list() {
    const documents = await this.documentQueryService.listDocuments()
    return createResponseEnvelope({
      documents,
    })
  }

  @Get(":id")
  @UseInterceptors(NegotiatedResponseInterceptor)
  async getOne(@Param() params: DocumentIdParamDto) {
    const document = await this.documentQueryService.getDocument(params.id)
    return createResponseEnvelope({
      document,
    })
  }

  @Get(":id/artifacts")
  @UseInterceptors(NegotiatedResponseInterceptor)
  async getArtifacts(@Param() params: DocumentIdParamDto) {
    const [manifest, chunks, embeddings] = await Promise.all([
      this.artifactQueryService.getManifest(params.id),
      this.artifactQueryService.getChunks(params.id),
      this.artifactQueryService.getEmbeddings(params.id),
    ])

    return createResponseEnvelope({
      manifest,
      chunks,
      embeddings,
    })
  }

  @Post(":id/reindex")
  @UseInterceptors(NegotiatedResponseInterceptor)
  async rebuildIndex(@Param() params: DocumentIdParamDto) {
    const document = await this.documentQueryService.getDocument(params.id)
    const taskId = await this.documentQueueService.enqueueRebuild(params.id)

    return createResponseEnvelope({
      document,
      taskId,
      eventsUrl: `/api/documents/${params.id}/events`,
    })
  }

  @Sse(":id/events")
  stream(@Param() params: DocumentIdParamDto) {
    return this.events.stream(params.id).pipe(
      map(
        event =>
          ({
            type: event.stage,
            data: event,
          }) satisfies MessageEvent,
      ),
    )
  }
}
