import { Module } from "@nestjs/common"
import { LangchainModule } from "../../langchain/langchain.module"
import { DocumentPersistenceModule } from "./document-persistence.module"
import { DocumentParseService } from "./services/document-parse.service"
import { DocumentProcessingService } from "./services/document-processing.service"
import { DocumentVectorizeService } from "./services/document-vectorize.service"
import { DocumentWorkerService } from "./services/document-worker.service"

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
