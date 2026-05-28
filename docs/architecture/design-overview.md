assistant/
├── apps/
│   ├── web/                     # 前端应用
│   │   ├── src/
│   │   ├── public/
│   │   └── vite.config.ts
│   │
│   └── admin/                   # 可选：后台管理台/运营台
│       ├── src/
│       └── vite.config.ts
│
├── services/
│   ├── api/                     # NestJS 主 API 服务
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── user/
│   │   │   │   ├── document/
│   │   │   │   ├── knowledge-base/
│   │   │   │   ├── rag/
│   │   │   │   ├── chat/
│   │   │   │   └── common/
│   │   │   ├── infra/
│   │   │   │   ├── db/
│   │   │   │   ├── redis/
│   │   │   │   ├── storage/
│   │   │   │   └── vector-db/
│   │   │   ├── config/
│   │   │   └── main.ts
│   │   └── test/
│   │
│   ├── worker/                  # 异步任务服务：解析、切分、embedding、重建索引
│   │   ├── src/
│   │   │   ├── jobs/
│   │   │   ├── processors/
│   │   │   └── main.ts
│   │   └── test/
│   │
│   └── gateway/                 # 可选：BFF / API Gateway
│       ├── src/
│       └── main.ts
│
├── packages/
│   ├── ui/                      # Shadow UI 扩展组件、业务组件
│   ├── shared/                  # 前后端共享类型、常量、工具函数
│   ├── api-client/              # 请求 SDK，统一对接后端接口
│   ├── configs/                 # eslint/tsconfig/prettier 统一配置
│   └── prompts/                 # Prompt 模板、RAG 模板、Agent 工具描述
│
├── tools/
│   ├── scripts/
│   ├── generators/
│   └── docker/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   └── decisions/
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json