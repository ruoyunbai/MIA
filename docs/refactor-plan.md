## 当前问题概览

### 前端
- `src/store/useStore.ts` 把用户、聊天、知识库等所有状态和 mock 数据塞在一个 Zustand store 里（数百行），状态难以按功能拆分或与 API 同步，且初始数据与后端实体耦合弱。
- `src/hooks/useChat.ts` 仍通过 `simulateTyping` 产生静态回复，和后端的 LLM/文档能力完全脱节，无法验证真实链路。（这一条不用管，我还在开发中）
- `src/utils/request.ts` 自定义的 `ApiResponse` 与后端 `backend/src/common/dto/api-response.dto.ts` 的定义需要人工同步，随着字段增多会越来越容易漂移。
- `ChatInterface` 这类组件还混合了 layout、交互和业务逻辑，后续维护困难。

### 后端

- `backend/src/documents/documents.service.ts` 同时负责 COS 上传、URL 签名、PDF/Word/Web 解析，职责臃肿，难以扩展成异步任务或接入队列。

- 后端只提供 `buildSuccessResponse`，异常仍直接抛出 `HttpException`，与前端 `axios` 的 `code/message` 约定不完全契合。

## 重构规划

### 1. 前端架构梳理
1. 将 `useStore` 改为 `createUserSlice`、`createChatSlice`、`createKnowledgeSlice` 等组合，拆掉 mock 数据，只负责状态；数据获取用 hooks/service 发请求。
2. 引入统一的 API 契约工具（如基于 Swagger 的代码生成或 `ts-rest`），派生 axios 实例 & DTO，避免手写 `ApiResponse`。
3. 以领域模块组织目录，例如 `src/features/chat` 下包含 `components/hooks/api/store`，`ChatInterface` 只做视图，交互抽到 hooks。

### 2. 聊天链路打通 （这一条不用管，我还在开发中）
1. 在前端定义 `chatService.sendMessage`，通过真实接口调用后端 `llm`/`documents` 能力；`useChat` 负责请求状态和消息队列。
2. 后端增加 `ChatController`，封装检索、LLM 调用、引用来源返回格式，明确响应 schema，配合前端 SDK 使用。

### 3. 后端模块治理

1. 将实体迁移到各自模块（如 `documents/entities/document.entity.ts`），对应模块 `forFeature` 导入，减少全局依赖。
2. 拆 `DocumentsService` 为存储、解析两个 provider：`DocumentsStorageService` 负责 COS，`DocumentsParsingService` 处理解析，可进一步放到队列 worker 中。
3. 为 LLM 能力提供配置化 provider：抽离 `ChatOpenAI` / `OpenAI` 客户端创建逻辑，统一使用 `Logger` 输出脱敏信息，并预留多模型扩展点。
4. 增加全局异常过滤器（extends `BaseExceptionFilter`），将所有异常包装为 `{ code, message, data }`，与前端响应格式保持一致。


