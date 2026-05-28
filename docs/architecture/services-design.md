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
 + Prisma 或 Drizzle：数据库 ORM / 查询层
 + Redis：缓存、会话状态、限流、任务中间状态
 + BullMQ：异步任务队列，适合文档解析、embedding、索引重建
 + MinIO / S3：文件存储，保存原始文档和解析后的中间产物

RAG / AI 相关
 + LangChain.js：编排 RAG 流程、工具调用、检索链路
 + Embedding 服务适配层：统一接入 OpenAI、Azure OpenAI、Voyage、Jina、BGE 等模型
 
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


# 异步任务系统（RAG 核心）
这是整个系统最关键的一层：
 + BullMQ（任务队列）
 + Redis（任务缓存 + 状态流转）
 + Worker Service（独立进程）

worker 负责的任务：
 + 文档解析（PDF / Markdown / HTML）
 + OCR（图片类文档）
 + Chunk 切分（文本分块策略）
 + Embedding 生成
 + 向量入库
 + 索引构建与重建


# 共享层技术栈

这部分非常关键，尤其是前后端统一使用 TS 时。
 + packages/shared：共享类型、枚举、常量、DTO 基础定义
 + packages/api-client：接口请求 SDK
 + packages/configs：统一 ESLint、TSConfig、Prettier 配置
 + packages/prompts：Prompt 模板、系统提示词、工具定义
 + packages/ui：可复用业务组件

共享层的价值在于：
前后端协议统一、类型统一、配置统一、Prompt 资产统一。