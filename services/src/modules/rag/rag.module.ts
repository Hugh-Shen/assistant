import { Module } from "@nestjs/common"
import { LangchainModule } from "../../langchain/langchain.module"
import { ChatModule } from "../chat/chat.module"
import { RagController } from "./rag.controller"
import { RagQueryService } from "./services/rag-query.service"

@Module({
  imports: [LangchainModule, ChatModule],
  controllers: [RagController],
  providers: [RagQueryService],
  exports: [RagQueryService],
})
export class RagModule {}
