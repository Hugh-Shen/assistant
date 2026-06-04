import { registerAs } from "@nestjs/config"

export const appConfig = registerAs("app", () => ({
  port: Number(process.env.PORT ?? 3001),
  globalPrefix: process.env.GLOBAL_PREFIX ?? "api",
  corsEnabled: (process.env.CORS_ENABLED ?? "true") !== "false",
}))
