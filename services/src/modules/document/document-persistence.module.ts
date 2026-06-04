import { Module } from "@nestjs/common"
import { PrismaModule } from "../../infra/db/prisma.module"
import { DOCUMENT_ARTIFACT_REPOSITORY } from "./ports/document-artifact.repository.port"
import { DOCUMENT_EVENT_REPOSITORY } from "./ports/document-event.repository.port"
import { DOCUMENT_REPOSITORY } from "./ports/document.repository.port"
import { PrismaDocumentArtifactRepository } from "./repositories/prisma-document-artifact.repository"
import { PrismaDocumentEventRepository } from "./repositories/prisma-document-event.repository"
import { PrismaDocumentRepository } from "./repositories/prisma-document.repository"
import { DocumentEventsService } from "./services/document-events.service"

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: DOCUMENT_REPOSITORY,
      useClass: PrismaDocumentRepository,
    },
    {
      provide: DOCUMENT_ARTIFACT_REPOSITORY,
      useClass: PrismaDocumentArtifactRepository,
    },
    {
      provide: DOCUMENT_EVENT_REPOSITORY,
      useClass: PrismaDocumentEventRepository,
    },
    DocumentEventsService,
  ],
  exports: [
    DOCUMENT_REPOSITORY,
    DOCUMENT_ARTIFACT_REPOSITORY,
    DOCUMENT_EVENT_REPOSITORY,
    DocumentEventsService,
  ],
})
export class DocumentPersistenceModule {}
