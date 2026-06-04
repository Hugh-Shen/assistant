import { Module } from "@nestjs/common"
import { DocumentController } from "./document.controller"
import { NegotiatedResponseInterceptor } from "../../common/http"
import { LocalDocumentStorageService } from "../../infra/storage/local-document-storage.service"
import { DocumentPersistenceModule } from "./document-persistence.module"
import { DocumentArtifactQueryService } from "./services/document-artifact-query.service"
import { DocumentQueryService } from "./services/document-query.service"
import { DocumentQueueService } from "./services/document-queue.service"
import { DocumentUploadService } from "./services/document-upload.service"

@Module({
  imports: [DocumentPersistenceModule],
  controllers: [DocumentController],
  providers: [
    LocalDocumentStorageService,
    DocumentArtifactQueryService,
    DocumentQueryService,
    DocumentQueueService,
    DocumentUploadService,
    NegotiatedResponseInterceptor,
  ],
  exports: [DocumentUploadService, DocumentQueryService],
})
export class DocumentModule {}
