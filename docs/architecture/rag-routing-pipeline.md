# RAG `ask` 接口流程

这份文档只讲当前 `POST /api/rag/ask` 这一个接口的执行逻辑，并按两条主线展开：

1. `json` 模式怎么做
2. `stream` 模式怎么做

每条主线都按同样的顺序整理：

- `ask` 接口入口
- `routing` 怎么决定
- `答案生成` 怎么执行
- 最终怎么返回 / 落库

文档内容以当前代码为准，不保留旧实现描述。

其中会重点展开 `stream` 模式，因为当前前端更常用流式返回，`askStream(...)` 的返回结构也比 `ask(...)` 更值得单独说明。

## 1. 接口入口

主要文件：

- [services/src/modules/rag/rag.controller.ts](/Users/admin/Desktop/works/learn/assistant/services/src/modules/rag/rag.controller.ts)
- [services/src/modules/rag/services/rag-query.service.ts](/Users/admin/Desktop/works/learn/assistant/services/src/modules/rag/services/rag-query.service.ts)
- [packages/shared/src/rag/rag.types.ts](/Users/admin/Desktop/works/learn/assistant/packages/shared/src/rag/rag.types.ts)

请求结构：

```ts
export interface RagAskRequest {
  question: string
  topK?: number
  conversationId?: string
}
```

字段含义：

- `question`：当前问题
- `topK`：知识库召回数量上限
- `conversationId`：可选，会触发历史会话读取和结果持久化

Controller 的入口逻辑很简单，先决定响应模式，再分别走 `ask` 或 `askStream`：

```ts
const responseMode = resolveResponseMode(request.headers)

if (responseMode === "stream") {
  const response = await this.ragQueryService.askStream(
    body.question,
    body.topK,
    body.conversationId,
  )
  // 返回 SSE
}

const response = await this.ragQueryService.ask(
  body.question,
  body.topK,
  body.conversationId,
)
// 返回普通 JSON
```

所以当前文档的核心就是两条分支：

- `json -> ragQueryService.ask(...)`
- `stream -> ragQueryService.askStream(...)`

## 2. `json` 模式

## 2.1 入口

`json` 模式最终进入：

- [services/src/modules/rag/services/rag-query.service.ts](/Users/admin/Desktop/works/learn/assistant/services/src/modules/rag/services/rag-query.service.ts)

核心代码：

```ts
async ask(
  question: string,
  topK = 4,
  conversationId?: string,
): Promise<RagAskResponse> {
  const retrieval = await this.retriever.retrieve(question, topK)
  const history = conversationId
    ? await this.chatRepository.listMessages(conversationId)
    : []
  const answer = await this.answerGeneration.answer(
    question,
    retrieval.citations,
    retrieval.retrievalMode,
    history,
  )
```

可以把 `json` 模式理解成 4 步：

1. 先做 retrieval
2. 如果有 `conversationId`，读取历史会话
3. 调用答案生成
4. 如果有会话，再把本轮问答落库

## 2.2 `routing` 怎么做

`json` 模式和 `stream` 模式共用同一套 routing。

主要文件：

- [services/src/langchain/retrievers/hybrid-retriever.service.ts](/Users/admin/Desktop/works/learn/assistant/services/src/langchain/retrievers/hybrid-retriever.service.ts)
- [services/src/langchain/chains/context-sufficiency.service.ts](/Users/admin/Desktop/works/learn/assistant/services/src/langchain/chains/context-sufficiency.service.ts)
- [services/src/config/rag.config.ts](/Users/admin/Desktop/works/learn/assistant/services/src/config/rag.config.ts)

`retrieve(...)` 的主流程：

```ts
const rawKnowledgeBaseCitations = await this.knowledgeBaseRetriever.search(
  question,
  topK,
)
const knowledgeBaseCitations = this.filterKnowledgeBaseCitations(
  rawKnowledgeBaseCitations,
)
const routing = await this.contextSufficiencyService.decideKnowledgeBaseRouting(
  question,
  knowledgeBaseCitations,
)
const searchAvailable = this.isSearchAvailable()

const needsWebSearch =
  routing.shouldBlendWithWebSearch || routing.shouldFallbackToWebSearch
const webCitations =
  needsWebSearch && searchAvailable ? await this.searchWeb(question) : []
```

当前顺序非常明确：

1. 先查知识库
2. 对知识库结果做生成前过滤
3. 用过滤后的知识库结果做 routing 判断
4. 如果 routing 认为需要 search，并且 search provider 可用，再去做 web search
5. 对 web 结果再做一轮生成前过滤
6. 把最终结果组装成 `retrievalMode + routingReason + citations`

### 2.2.1 知识库召回

主要文件：

- [services/src/langchain/retrievers/pgvector-retriever.service.ts](/Users/admin/Desktop/works/learn/assistant/services/src/langchain/retrievers/pgvector-retriever.service.ts)

核心 SQL：

```ts
const rows = await this.prisma.$queryRaw(
  Prisma.sql`
    SELECT
      de.document_id,
      de.chunk_id,
      dc.text,
      de.embedding <=> ${vectorLiteral}::vector AS distance
    FROM document_embeddings de
    INNER JOIN document_chunks dc ON dc.id = de.chunk_id
    ORDER BY de.embedding <=> ${vectorLiteral}::vector ASC
    LIMIT ${topK}
  `,
)
```

逻辑解释：

- 先把当前问题转成 embedding
- 再在 `document_embeddings` 里按向量距离排序
- 最后拿前 `topK` 条结果

score 的计算方式：

```ts
score: Number((1 - row.distance).toFixed(6))
```

所以知识库 `score` 是：

- `1 - 向量距离`

它是相似度数值，不是向量本身。

### 2.2.2 生成前过滤

这是当前实现里非常重要的一层。

知识库结果过滤：

```ts
private filterKnowledgeBaseCitations(citations: RagCitation[]) {
  const minScore = this.configService.get<number>(
    "rag.knowledgeBaseGenerationMinScore",
    0.1,
  )

  return citations.filter(citation => citation.score >= minScore)
}
```

Web 结果过滤：

```ts
return citations.filter(
  citation =>
    citation.score >=
    this.configService.get<number>("rag.webGenerationMinScore", 0.15),
)
```

这表示：

- 原始召回结果不会全部进入最终 `citations`
- 只有达到最小生成阈值的结果才会进入后续流程

所以现在的 `citations` 语义是：

- 最终允许送进答案生成的上下文集合

不是：

- 原始召回全集

### 2.2.3 当前 routing 规则

主要文件：

- [services/src/langchain/chains/context-sufficiency.service.ts](/Users/admin/Desktop/works/learn/assistant/services/src/langchain/chains/context-sufficiency.service.ts)

当前 routing 已经简化成基于 top score 的阈值判断：

```ts
if (citations.length === 0) {
  return {
    shouldUseKnowledgeBaseOnly: false,
    shouldBlendWithWebSearch: false,
    shouldFallbackToWebSearch: true,
    reason: "no_knowledge_base_results",
  }
}

const routeThreshold = this.configService.get<number>(
  "rag.knowledgeBaseRouteThreshold",
  0.85,
)
const topScore = citations[0]?.score ?? 0

if (topScore >= routeThreshold) {
  return {
    shouldUseKnowledgeBaseOnly: true,
    shouldBlendWithWebSearch: false,
    shouldFallbackToWebSearch: false,
    reason: "top_score_above_route_threshold",
  }
}

return {
  shouldUseKnowledgeBaseOnly: false,
  shouldBlendWithWebSearch: false,
  shouldFallbackToWebSearch: true,
  reason: "top_score_below_route_threshold",
}
```

可以直接理解成：

- 没有知识库结果：走 search
- 最高分达到阈值：走 knowledge base
- 最高分没达到阈值：走 search

### 2.2.4 关于 `hybrid`

当前代码里 `shared types`、prompt builder 和 `HybridRetrieverService` 仍然保留了 `hybrid` 分支，但按现在的 routing 逻辑：

- `shouldBlendWithWebSearch` 始终不会被设为 `true`

也就是说：

- `hybrid` 目前是保留能力
- 但按当前 routing 实现，正常路径下不会主动进入

文档和排查时都应该按这个事实理解，而不是按旧逻辑假设它还在常规工作。

### 2.2.5 最终 retrieval 结果如何组装

`resolveRetrievalResult(...)` 会把 routing 结果转成最终返回结构：

```ts
if (routing.shouldUseKnowledgeBaseOnly && webCitations.length === 0) {
  return this.buildResult(
    "knowledge_base",
    routing.reason,
    knowledgeBaseCitations,
    knowledgeBaseCitations,
    webCitations,
  )
}

if (webCitations.length > 0) {
  return this.buildResult(
    "search",
    routing.reason,
    webCitations,
    knowledgeBaseCitations,
    webCitations,
  )
}

return this.buildResult(
  "none",
  this.resolveFallbackReason(
    routing.reason,
    needsWebSearch,
    searchAvailable,
    "_search_unavailable",
  ),
  [],
  [],
  webCitations,
)
```

当前稳定会出现的模式是：

- `knowledge_base`
- `search`
- `none`

额外细节：

- 如果 routing 需要 web search，但 provider 不可用，会在 `routingReason` 后追加 `_search_unavailable`
- 如果 routing 需要 web search，但 provider 可用却没查到任何 citation，也会最终落到 `none`

## 2.3 答案生成怎么做

主要文件：

- [services/src/langchain/chains/answer-generation.service.ts](/Users/admin/Desktop/works/learn/assistant/services/src/langchain/chains/answer-generation.service.ts)
- [services/src/langchain/prompts/rag-answer.prompt.ts](/Users/admin/Desktop/works/learn/assistant/services/src/langchain/prompts/rag-answer.prompt.ts)

`json` 模式调用的是：

```ts
const answer = await this.answerGeneration.answer(
  question,
  retrieval.citations,
  retrieval.retrievalMode,
  history,
)
```

### 2.3.1 先判断是否直接返回兜底答案

这是当前生成层新增的重要分支。

```ts
const fallbackAnswer = this.getFallbackAnswer(retrievalMode, citations)

if (fallbackAnswer) {
  return fallbackAnswer
}
```

`getFallbackAnswer(...)` 的逻辑：

```ts
if (retrievalMode === "none") {
  return "抱歉，我暂时不知道这个问题的答案。"
}

if (
  (retrievalMode === "search" || retrievalMode === "hybrid") &&
  citations.length === 0
) {
  return "抱歉，我暂时不知道这个问题的答案。"
}
```

也就是说，下面两类情况不会再调 LLM：

- `retrievalMode === "none"`
- `search/hybrid` 但没有任何可用 citations

而是直接返回固定中文兜底答案：

```ts
"抱歉，我暂时不知道这个问题的答案。"
```

### 2.3.2 有上下文时才构建 prompt 并调用 LLM

```ts
const prompt = buildRagAnswerPrompt({
  question,
  citations,
  retrievalMode,
  history,
})

const response =
  await this.llmClientRepository.getClient().chat.completions.create({
    model: this.config.chatModel,
    messages: [
      {
        role: "system",
        content: prompt.system,
      },
      {
        role: "user",
        content: prompt.user,
      },
    ],
  })
```

这里有两层逻辑：

1. `buildRagAnswerPrompt(...)` 负责拼 prompt
2. `chat.completions.create(...)` 负责真正生成答案

### 2.3.3 Prompt 是怎么组织的

主要文件：

- [services/src/langchain/prompts/rag-answer.prompt.ts](/Users/admin/Desktop/works/learn/assistant/services/src/langchain/prompts/rag-answer.prompt.ts)

历史会话格式化：

```ts
function formatHistory(history: ChatMessageRecord[] = []) {
  return history
    .slice(-6)
    .map(message => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n")
}
```

这说明：

- 即使数据库里有完整会话
- 真正进入 prompt 的也只有最后 6 条消息

citations 格式化：

```ts
function formatCitations(citations: RagCitation[]) {
  return citations
    .map(
      (item, index) =>
        `Source ${index + 1}:\nType: ${item.sourceType}\nSource: ${item.source ?? "unknown"}\nTitle: ${item.title ?? item.documentId ?? "untitled"}\nURL: ${item.url ?? "n/a"}\nDocument: ${item.documentId ?? "n/a"}\nChunk: ${item.chunkId ?? "n/a"}\nContent: ${item.text}`,
    )
    .join("\n\n")
}
```

这也是为什么前端拿到的 citation 字段会比较多，因为它们本身就是生成 prompt 的输入元数据。

### 2.3.4 不同 retrievalMode 的 prompt 差异

`search`：

```ts
return `Current Question:\n${question}\n\nWeb Context:\n${context}\n\nInstruction:\n1. Use only the current question and the provided web context.\n2. Ignore unrelated prior conversation.\n3. Do not mention unrelated knowledge-base topics.\n4. Answer the user's real question directly.`
```

特点：

- 不显式带历史会话
- 只允许使用 web context

`none`：

```ts
return `Current Question:\n${question}\n\nInstruction:\n1. There is no reliable context for answering this question.\n2. Reply briefly and naturally that you do not currently know or do not have enough information.\n3. Do not mention unrelated knowledge-base content.\n4. Do not mention the knowledge base unless the user explicitly asks about it.`
```

但注意：

- 正常情况下 `none` 已经会被 `getFallbackAnswer(...)` 直接短路
- 所以这个 prompt 更像保底的结构定义

`knowledge_base`：

```ts
return `Conversation History:\n${historyBlock || "No prior history"}\n\nCurrent Question:\n${question}\n\nKnowledge Base Context:\n${context}\n\nInstruction:\n1. First decide whether the provided knowledge-base context directly answers the current question.\n2. If yes, answer using only the relevant parts.\n3. If no, reply briefly and naturally that you do not currently know or do not have enough information.\n4. Do not summarize or list unrelated knowledge-base content.\n5. Do not mention the knowledge base unless the user explicitly asks about it.`
```

特点：

- 会显式带历史会话
- 优先只回答真正相关的知识库内容

## 2.4 `json` 模式的落库和返回

如果传了 `conversationId`，会在答案生成后执行：

```ts
await this.chatQueryService.ensureConversationTitle(conversationId, question)
await this.chatRepository.createMessage(conversationId, "user", question)
await this.chatRepository.createMessage(conversationId, "assistant", answer)
```

这表示：

- 历史消息读取发生在本轮落库之前
- 所以生成时看到的是旧历史
- 当前 user / assistant 消息是在生成结束后才写入

最终 `json` 返回结构：

```ts
return {
  question,
  answer,
  retrievalMode: retrieval.retrievalMode,
  routingReason: retrieval.routingReason,
  citations: retrieval.citations,
}
```

## 3. `stream` 模式

`stream` 是当前更值得重点理解的路径，因为它不是“把 `json` 结果拆成多段发送”这么简单，而是专门设计成了：

- 先返回一份检索阶段的 `initial`
- 再返回一个真正的文本流 `stream`
- 最后由 `persist(answer)` 决定什么时候把完整答案落库

也就是说，`askStream(...)` 返回的不是“答案”，而是“一套驱动 SSE 输出的中间协议”。

## 3.1 入口

`stream` 模式最终进入：

- [services/src/modules/rag/services/rag-query.service.ts](/Users/admin/Desktop/works/learn/assistant/services/src/modules/rag/services/rag-query.service.ts)

核心代码：

```ts
const retrieval = await this.retriever.retrieve(question, top rte
const history = conversationId
  ? await this.chatRepository.listMessages(conversationId)
  : []

return {
  initial: {
    question,
    retrievalMode: retrieval.retrievalMode,
    routingReason: retrieval.routingReason,
    citations: retrieval.citations,
  },
  stream: this.answerGeneration.streamAnswer(
    question,
    retrieval.citations,
    retrieval.retrievalMode,
    history,
  ),
  persist: async (answer: string) => { ... }
}
```

和 `json` 模式相比，`stream` 模式不会立刻拿到完整答案，而是拆成三部分：

- `initial`
- `stream`
- `persist`

这三部分要分开理解。

### 3.1.1 `askStream(...)` 的返回到底是什么

`askStream(...)` 的签名是：

```ts
Promise<{
  initial: Omit<RagAskResponse, "answer">
  stream: Observable<string>
  persist: (answer: string) => Promise<void>
}>
```

每个字段的职责不同：

- `initial`
  - 是一份“生成开始前就已经确定”的结果
  - 包含 `question / retrievalMode / routingReason / citations`
  - 不包含 `answer`
- `stream`
  - 是真正的模型输出流
  - 类型是 `Observable<string>`
  - 每次 `next(...)` 推出一段文本增量
- `persist`
  - 不是生成逻辑本身
  - 而是“当完整答案已经拼出来后，如何落库”的回调

所以 `askStream(...)` 的意义不是直接返回前端要展示的数据，而是把流式回答拆成了三个阶段：

1. 检索阶段元数据
2. 增量生成阶段
3. 生成完成后的持久化阶段

### 3.1.2 为什么要这样拆

这种拆分解决了两个实际问题：

- 前端在模型开始吐字前，就能拿到 `retrievalMode / routingReason / citations`
- 如果流中断，不会把半截 assistant 回答写进数据库

这也是 `stream` 路径和 `json` 路径最大的设计区别。

## 3.2 `routing` 怎么做

`stream` 模式的 retrieval / routing 与 `json` 模式完全一致。

也就是说它同样会经历：

1. 知识库召回
2. 生成前过滤
3. 路由判断
4. 需要时再做 web search
5. 生成最终 `retrievalMode / routingReason / citations`

所以 `stream` 模式下：

- `started` 事件里拿到的 `citations`
- 和真正送进 `streamAnswer(...)` 的 `citations`

是同一批结果。

这点很重要，因为它意味着：

- `started` 事件不是“预估结果”
- 而是已经确定会参与生成的正式上下文

前端如果要在侧边栏里展示 citation、routing reason、检索模式，`started` 事件就是可信来源，不需要再等 `completed`。

## 3.3 答案生成怎么做

`stream` 模式调用的是：

```ts
stream: this.answerGeneration.streamAnswer(
  question,
  retrieval.citations,
  retrieval.retrievalMode,
  history,
)
```

### 3.3.1 先检查是否直接返回兜底答案

和 `json` 模式一样，`streamAnswer(...)` 也会先走：

```ts
const fallbackAnswer = this.getFallbackAnswer(retrievalMode, citations)

if (fallbackAnswer) {
  subscriber.next(fallbackAnswer)
  subscriber.complete()
  return () => undefined
}
```

所以在这些场景下：

- `retrievalMode === "none"`
- 或 `search/hybrid` 且 `citations.length === 0`

流式输出不会真的调 LLM，而是：

1. 直接发出固定兜底答案
2. 立即完成流

所以即使是 `stream` 模式，也不代表一定会发生真正的 LLM streaming。

### 3.3.2 `streamAnswer(...)` 返回的 `Observable<string>` 是怎么被消费的

`AnswerGenerationService.streamAnswer(...)` 只负责输出“文本增量”，它并不知道 SSE 事件名，也不关心前端协议。

它的职责非常纯粹：

- 有 fallback，就直接 `next(完整兜底句子)` 然后 `complete()`
- 有正常上下文，就把 OpenAI 兼容流里的 `delta.content` 一段段吐出来

核心代码：

```ts
for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content

  if (!delta) {
    continue
  }

  subscriber.next(delta)
}
```

也就是说，`streamAnswer(...)` 发出的每个字符串，都只是“原始文本片段”，还不是：

- `started`
- `delta`
- `completed`

这些事件名是在 Controller 层再包出来的。

### 3.3.3 有上下文时才真正开启 LLM 流

```ts
const prompt = buildRagAnswerPrompt({
  question,
  citations,
  retrievalMode,
  history,
})

const stream =
  await this.llmClientRepository.getClient().chat.completions.create(
    {
      model: this.config.chatModel,
      stream: true,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
    },
    {
      signal: controller.signal,
    },
  )
```

然后逐块向外吐出 `delta`：

```ts
for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content

  if (!delta) {
    continue
  }

  subscriber.next(delta)
}
```

### 3.3.4 中断处理

`streamAnswer(...)` 内部用了 `AbortController`：

```ts
return () => {
  controller.abort()
}
```

Controller 这边也会在请求关闭时取消订阅：

```ts
request.on("close", () => {
  subscription.unsubscribe()
})
```

这保证了：

- 用户断开连接后，LLM 流会被中止
- 不会继续无意义地消耗生成资源

## 3.4 `stream` 模式最终怎么返回

主要文件：

- [services/src/modules/rag/rag.controller.ts](/Users/admin/Desktop/works/learn/assistant/services/src/modules/rag/rag.controller.ts)

这里最值得细讲的是：Controller 并不是把 `Observable<string>` 原样返回给前端，而是把它转换成一套带事件名的输出协议。

Controller 会先发 `started`：

```ts
subscriber.next({
  type: "started",
  data: response.initial,
})
```

然后每来一个模型 token / 文本块，就发一个 `delta`：

```ts
next: delta => {
  answer += delta
  subscriber.next({
    type: "delta",
    data: { delta },
  })
}
```

最后在完成时：

1. 调 `persist(answer)` 落库
2. 发 `completed`

```ts
complete: () => {
  void response
    .persist(answer)
    .then(() => {
      subscriber.next({
        type: "completed",
        data: {
          ...response.initial,
          answer,
        },
      })
      subscriber.complete()
    })
}
```

所以 `stream` 模式的完整事件顺序是：

1. `started`
2. 多个 `delta`
3. `completed`

可以把它理解成下面这层转换：

- `askStream().initial` -> `started`
- `askStream().stream` 的每个字符串 -> `delta`
- `askStream().persist(answer)` 执行成功后 -> `completed`

### 3.4.1 `started` 事件里为什么没有 `answer`

因为 `started` 直接使用的是：

```ts
initial: Omit<RagAskResponse, "answer">
```

它只包含生成前已经确定的内容：

- `question`
- `retrievalMode`
- `routingReason`
- `citations`

这意味着前端在 `started` 阶段就可以：

- 显示检索来源
- 显示 routing reason
- 渲染 citations
- 展示“正在回答”

而不需要等模型回答完。

### 3.4.2 Controller 为什么要自己累积 `answer`

Controller 里有一个局部变量：

```ts
let answer = ""
```

然后每次收到 `delta` 都会累加：

```ts
next: delta => {
  answer += delta
  subscriber.next({
    type: "delta",
    data: { delta },
  })
}
```

这是因为：

- `streamAnswer(...)` 只负责吐增量
- 但 `persist(answer)` 需要完整答案
- `completed` 事件里也需要带完整 `answer`

所以“拼完整答案”这件事被放在 Controller 层完成，而不是放在 AnswerGenerationService 里。

### 3.4.3 `completed` 事件为什么要等 `persist` 成功后再发

当前代码顺序是：

1. 流生成完成
2. 先执行 `persist(answer)`
3. 成功后再发 `completed`

对应代码：

```ts
complete: () => {
  void response
    .persist(answer)
    .then(() => {
      subscriber.next({
        type: "completed",
        data: {
          ...response.initial,
          answer,
        },
      })
      subscriber.complete()
    })
}
```

这表示当前语义是：

- `completed` 不只是“模型吐完了”
- 也是“这条回答已经成功完成持久化流程了”

这样前端如果收到 `completed`，可以更放心地认为这轮消息已经是完整结束态。

## 3.5 `stream` 模式的落库特点

`stream` 模式最重要的设计点是：

- assistant 消息不是边生成边落库
- 而是等整段答案生成完成后再统一持久化

对应代码：

```ts
persist: async (answer: string) => {
  if (!conversationId) {
    return
  }

  await this.chatQueryService.ensureConversationTitle(conversationId, question)
  await this.chatRepository.createMessage(conversationId, "user", question)
  await this.chatRepository.createMessage(
    conversationId,
    "assistant",
    answer,
  )
}
```

这个设计的好处是：

- 如果中途断流，不会保存半截回答
- 会话里只会出现完整 assistant 消息

### 3.5.1 `persist` 为什么独立出来

如果 `persist` 被放进 `streamAnswer(...)` 或 `askStream(...)` 内部自动执行，会有两个问题：

- 生成层必须关心数据库落库，职责会变重
- 一旦前端中途中断，容易出现“生成没看完但已经落了一部分状态”的歧义

现在把它独立成回调后，职责更清楚：

- `AnswerGenerationService` 只负责产出文本
- `RagQueryService.askStream(...)` 只负责把流能力和持久化能力打包出来
- `RagController` 负责把这三段拼成最终 SSE 生命周期

### 3.5.2 `stream` 模式和 `json` 模式最本质的区别

可以把两者差异压缩成一句话：

- `json` 是“先全部做完，再一次性返回”
- `stream` 是“先返回检索元数据，再边生成边推送，最后完成落库并结束”

## 4. 当前实现的几个关键结论

### 4.1 当前主要运行模式是 `knowledge_base / search / none`

虽然类型定义和 prompt 里保留了 `hybrid`，但按当前 routing 代码：

- `shouldBlendWithWebSearch` 不会被设为 `true`

所以日常排查时应优先按这三种模式理解：

- `knowledge_base`
- `search`
- `none`

### 4.2 历史会话只参与答案生成

当前不会用历史会话做：

- query 改写
- 向量召回
- routing 决策

只会在生成 prompt 时使用，而且：

- `knowledge_base` 会显式带历史
- `search` 不会显式带历史

### 4.3 `citations` 已经是“生成可用上下文”

当前返回给前端的 `citations` 已经经过：

- 知识库最小生成分数过滤
- web 最小生成分数过滤

所以它不是原始召回结果，而是：

- 最终允许进入答案生成的上下文

### 4.4 `none` 或无可用 citation 时会直接返回固定兜底答案

当前兜底答案是：

```ts
"抱歉，我暂时不知道这个问题的答案。"
```

这条规则同时适用于：

- `json`
- `stream`

## 5. 相关文件索引

- [services/src/modules/rag/rag.controller.ts](/Users/admin/Desktop/works/learn/assistant/services/src/modules/rag/rag.controller.ts)
- [services/src/modules/rag/services/rag-query.service.ts](/Users/admin/Desktop/works/learn/assistant/services/src/modules/rag/services/rag-query.service.ts)
- [services/src/langchain/retrievers/hybrid-retriever.service.ts](/Users/admin/Desktop/works/learn/assistant/services/src/langchain/retrievers/hybrid-retriever.service.ts)
- [services/src/langchain/retrievers/pgvector-retriever.service.ts](/Users/admin/Desktop/works/learn/assistant/services/src/langchain/retrievers/pgvector-retriever.service.ts)
- [services/src/langchain/chains/context-sufficiency.service.ts](/Users/admin/Desktop/works/learn/assistant/services/src/langchain/chains/context-sufficiency.service.ts)
- [services/src/langchain/chains/answer-generation.service.ts](/Users/admin/Desktop/works/learn/assistant/services/src/langchain/chains/answer-generation.service.ts)
- [services/src/langchain/prompts/rag-answer.prompt.ts](/Users/admin/Desktop/works/learn/assistant/services/src/langchain/prompts/rag-answer.prompt.ts)
- [services/src/config/rag.config.ts](/Users/admin/Desktop/works/learn/assistant/services/src/config/rag.config.ts)
