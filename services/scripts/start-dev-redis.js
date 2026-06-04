const RedisMemoryServer = require("redis-memory-server").default

async function main() {
  const server = await RedisMemoryServer.create({
    autoStart: true,
    instance: {
      port: process.env.REDISMS_PORT ? Number(process.env.REDISMS_PORT) : 6379,
      ip: "127.0.0.1",
    },
  })

  const host = await server.getHost()
  const port = await server.getPort()
  const redisUrl = `redis://${host}:${port}`

  console.log(`Dev Redis ready at ${redisUrl}`)

  const shutdown = async () => {
    await server.stop()
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
