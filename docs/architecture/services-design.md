# 目标
Document -> Chunk -> Embedding -> Vector Store -> Retrieval -> LLM


# 技术栈
NestJS Monolith + Worker 模式

核心
 + NestJS：主后端框架，结构清晰，适合模块化、领域化拆分
 + TypeScript：与前端保持同语言
 + REST API + SSE / WebSocket：普通接口用 REST，回答流式输出用 SSE 或 WebSocket

业务基础设施
 + PostgreSQL：业务数据存储，适合知识库、用户、文档、会话、权限等
 + Prisma：数据库 ORM / 查询主入口；`pgvector` 场景通过 Prisma raw SQL 处理
 + Redis：缓存、会话状态、限流、任务中间状态
 + BullMQ：异步任务队列，负责投递、重试、延迟执行、状态流转，适合文档解析、embedding、索引重建
 + MinIO / S3：文件存储，保存原始文档和解析后的中间产物

RAG / AI 相关
 + LangChain.js：编排 RAG 流程、工具调用、检索链路，重点用于在线查询链路而不是任务队列消费
 + Embedding Repository / Adapter 层：统一接入 OpenAI、Azure OpenAI、Voyage、Jina、BGE 等模型
 
向量数据库：
 + pgvector：轻量、易集成，适合中小规模
 + Qdrant / Milvus：适合更专业的向量检索场景
 + 重排模型（可选）：对召回结果二次排序，提高答案质量
 
后端工程能力
 + Zod / class-validator：参数校验
 + Pino / Winston：日志
 + Swagger / OpenAPI：接口文档
 + JWT + RBAC：鉴权与权限控制
 + 定时任务：清理过期索引、重建知识库、同步状态


# API 服务能力
 + Auth 鉴权（JWT / Session）
 + User 管理
 + Document 元数据管理(文档资源)
 + Chat 会话管理
 + RAG Query 编排入口
 + 会话历史回放与上下文注入


# 异步任务系统（RAG 核心）
这是整个系统最关键的一层：
 + BullMQ（任务队列与调度层）
 + Redis（任务状态与队列后端）
 + Worker Service（独立进程 / 独立入口的执行层）

worker 负责的任务：
 + 文档解析（PDF / Markdown / HTML）
 + OCR（图片类文档）
 + Chunk 切分（文本分块策略）
 + Embedding 生成
 + 向量入库
 + 索引构建与重建

## 职责边界

### 1. BullMQ：只负责“排队和调度”

- 负责生产任务、消费任务、重试、并发控制、延迟任务、失败重跑
- 负责把重任务从 API 请求线程中剥离出来
- 不负责文档解析、embedding、检索链路这些业务实现

适合放进 BullMQ 的任务：

- 文档解析
- 文档切分
- embedding 生成
- 向量入库
- 索引重建
- 批量回填 / 批量修复

### 2. worker：只负责“执行重任务和异步任务”

- worker 是 BullMQ 的消费者，也是实际执行业务逻辑的进程
- 负责承接文档处理、索引重建、批量同步等高耗时任务
- 可以按任务类型拆分多个 worker，但每个 worker 仍然专注在执行，不承接对外 API

一句话理解：

- BullMQ 决定“任务什么时候执行、谁来执行”
- worker 决定“任务具体怎么执行”

### 3. LangChain.js：只负责“编排 RAG / Agent 链路”

- 负责 query -> retriever -> prompt -> model -> output 这条在线链路的编排
- 负责工具调用、检索增强、chain / agent 组合
- 可以接入 embedding model、retriever、reranker、tool calling
- 不负责充当任务队列，也不负责替代 worker 做异步消费

更适合放到 LangChain.js 的能力：

- RAG Query 编排入口
- Retriever + Re-ranker 组合
- Prompt 模板装配
- Tool calling
- Agent workflow

## 三者配合方式

推荐按下面的方式理解：

1. API 服务接收上传 / 重建请求
2. API 服务通过 BullMQ 投递异步任务
3. worker 消费任务并执行解析、切分、embedding、索引写入
4. 用户发起问答时，再由 LangChain.js 编排检索与回答链路

也就是说：

- BullMQ 解决“异步化”
- worker 解决“重计算执行”
- LangChain.js 解决“RAG 编排”

## 文档处理实现说明

当前 `services` 里的文档链路已经按这个方向落地：

- 原始文件：本地磁盘
- 文档元数据：Prisma -> PostgreSQL `documents` 表
- 文本分块：Prisma -> PostgreSQL `document_chunks` 表
- 向量：Prisma raw SQL -> PostgreSQL `document_embeddings` 表，`embedding` 列使用 `pgvector`
- 处理进度：SSE 事件流 + 文档状态字段

当前仓库中的角色映射：

- `DocumentQueueService`：BullMQ producer，负责投递 `process-document` / `rebuild-document-index`
- `worker/main.ts` + `WorkerModule`：worker 进程入口
- `DocumentWorkerService`：BullMQ consumer，负责把队列任务分发给处理服务
- `DocumentProcessingService`：文档处理编排，执行 parse -> chunk -> vectorize -> persist
- `LangchainModule`：已作为独立目录接入 embedding repository、pgvector retriever 与基础 answer chain
- `ChatModule`：负责会话列表、消息历史、会话上下文持久化
- `RagModule`：负责问答入口，串联检索、历史上下文与答案生成

当前环境补充说明：

- PostgreSQL 已接通，Prisma 可正常连接 `assistant` 数据库
- `pgvector` 扩展已启用，向量列已可用
- Redis 已通过 `redis-memory-server` 以 npm 依赖方式接通
- BullMQ worker 已完成真实队列消费验证
- 文档处理服务本身与真实异步队列都已经完成数据库与向量落库验证
- 前端已通过 `axios` 统一封装请求，聊天页可直接调用会话接口与 RAG 问答接口

## 当前在线问答链路

1. 前端通过 `apps/web/src/lib/http.ts` 统一封装 `axios`
2. 业务请求统一收口到 `apps/web/src/api/chat.ts`
3. 创建/选择会话时，前端调用：
   - `GET /api/chat/conversations`
   - `POST /api/chat/conversations`
   - `GET /api/chat/conversations/:id/messages`
4. 用户提问时，前端调用 `POST /api/rag/ask`
5. 后端 `RagQueryService` 会执行：
   - query embedding
   - pgvector 相似度召回
   - 按 `conversationId` 读取历史消息
   - 把历史消息与召回片段一起交给 `AnswerGenerationService`
   - 回答完成后持久化 `user / assistant` 消息

## 当前已知待增强项

- 流式回答目前还没有完整落地，当前主路径仍然是 JSON 响应
- 会话历史目前保存的是纯文本消息，citation 元数据还没有历史持久化
- LangChain 目录已经独立，但后续还可以继续抽出更完整的 session-aware chain / prompt 组织

## 本地开发启动约定

- 后端职责保持拆分，但联调时通过一个命令统一拉起：
  - `pnpm dev:backend`
- 这个命令会同时启动：
  - `services` API
  - `services` worker
  - `services` 本地 Redis
- 前端继续单独启动：
  - `pnpm dev:web`

详细流程见：`docs/architecture/document-pipeline.md`


# 共享层技术栈

这部分非常关键，尤其是前后端统一使用 TS 时。
 + packages/shared：共享类型、枚举、常量、DTO 基础定义
 + packages/api-client：接口请求 SDK
 + packages/configs：统一 ESLint、TSConfig、Prettier 配置
 + packages/prompts：Prompt 模板、系统提示词、工具定义
 + packages/ui：可复用业务组件

共享层的价值在于：
前后端协议统一、类型统一、配置统一、Prompt 资产统一。
