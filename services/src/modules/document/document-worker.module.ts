import { Module } from "@nestjs/common"
import { LangchainModule } from "../../langchain/langchain.module"
import { DocumentPersistenceModule } from "./document-persistence.module"
import { DocumentParseService } from "./services/worker/document-parse.service"
import { DocumentProcessingService } from "./services/worker/document-processing.service"
import { DocumentVectorizeService } from "./services/worker/document-vectorize.service"
import { DocumentWorkerService } from "./services/worker/document-worker.service"

@Module({
  imports: [DocumentPersistenceModule, LangchainModule],
  providers: [
    DocumentParseService,
    DocumentProcessingService,
    DocumentVectorizeService,
    DocumentWorkerService,
  ],
})
export class DocumentWorkerModule {}
