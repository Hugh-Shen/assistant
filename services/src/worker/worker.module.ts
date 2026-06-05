import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import {
  appConfig,
  databaseConfig,
  documentConfig,
  llmConfig,
  ragConfig,
} from "../config"
import { DocumentWorkerModule } from "../modules/document/document-worker.module"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      load: [appConfig, databaseConfig, documentConfig, llmConfig, ragConfig],
    }),
    DocumentWorkerModule,
  ],
})
export class WorkerModule {}
