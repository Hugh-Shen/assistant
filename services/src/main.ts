import "reflect-metadata"

import { NestFactory } from "@nestjs/core"
import { ConfigService } from "@nestjs/config"
import { ValidationPipe } from "@nestjs/common"
import { AppModule } from "./app.module"
import { HttpExceptionFilter } from "./common/filters/http-exception.filter"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())

  const globalPrefix = configService.get<string>("app.globalPrefix") ?? "api"
  const corsEnabled = configService.get<boolean>("app.corsEnabled") ?? true
  const port = configService.get<number>("app.port") ?? 3001

  app.setGlobalPrefix(globalPrefix)

  if (corsEnabled) {
    app.enableCors()
  }

  await app.listen(port)
}

void bootstrap()
