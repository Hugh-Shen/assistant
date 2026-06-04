import { Module } from "@nestjs/common"
import { PrismaModule } from "../../infra/db/prisma.module"
import { CHAT_REPOSITORY } from "./ports/chat.repository.port"
import { ChatController } from "./chat.controller"
import { PrismaChatRepository } from "./repositories/prisma-chat.repository"
import { ChatQueryService } from "./services/chat-query.service"

@Module({
  imports: [PrismaModule],
  controllers: [ChatController],
  providers: [
    {
      provide: CHAT_REPOSITORY,
      useClass: PrismaChatRepository,
    },
    ChatQueryService,
  ],
  exports: [CHAT_REPOSITORY, ChatQueryService],
})
export class ChatModule {}
