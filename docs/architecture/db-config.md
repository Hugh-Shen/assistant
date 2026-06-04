# postgresql 数据库配置
连接名称：`assistant`
主机：`localhost`
端口：`5432`
数据库名称：`assistant`
用户名：`hugh`
密码：`123456`

## 当前落地

- 应用配置文件：`services/.env.local`
- Prisma 配置文件：`services/prisma.config.ts`
- 实际连接串：`postgresql://hugh:123456@localhost:5432/assistant`
- 本地数据库扩展：`pgvector` 已启用
- 当前本机 PostgreSQL：`postgresql@18`
- 本地 Redis：`redis-memory-server`（npm dev dependency）
- Redis 地址：`redis://127.0.0.1:6379`
- LLM 配置统一由 Nest `ConfigModule` + `services/src/config/llm.config.ts` 管理
- 当前问答链路使用：
  - `OPENAI_API_KEY`
  - `OPENAI_API_BASE_URL`
  - `OPENAI_EMBEDDING_MODEL`（未配置时使用默认值）
  - `OPENAI_CHAT_MODEL`（未配置时使用默认值）
