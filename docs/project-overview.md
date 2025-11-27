# MIA 项目简介

MIA（Merchant Intelligent Assistant）是面向电商商家和运营人员的一套智能助手，目标是把“咨询-查询-执行”链路打通，让一线团队可以在一个界面里完成规则检索、知识库管理、聊天问答和运营盘点等任务。仓库采用前后端一体化结构，通过统一的脚手架与 lint 规范保持协作一致。

## 前端（`frontend/`）
- 技术栈：Vite + React + TypeScript，状态管理使用 Zustand，UI 组件主体来源于 Shadcn + Arco，支持响应式布局。
- 核心模块：聊天（`src/features/chat`）、知识库（`src/components/knowledge-base`）、仪表盘页面等，路由基于 React Router v7。
- 网络层：封装在 `src/utils/request.ts` 的 axios 实例，默认访问 `/api`，所有接口响应遵循统一的 `{ code, message, data }` 格式，并通过共享的 `shared/api-contracts` 类型定义约束前后端契约。

## 后端（`backend/`）
- 技术栈：NestJS + TypeORM + MySQL，提供身份认证、文档上传解析、知识库分类、LLM 会话等能力，Swagger 自动生成 API 文档。
- 模块划分：`auth`/`users` 负责登录注册与邮箱验证；`documents` 拆为 COS 存储与文档解析服务；`llm` 对接 OpenAI/第三方大模型，并内置 Chroma + LangChain 的向量检索；`categories`/`entities` 管理知识库元数据。
- 基础设施：全局异常过滤器输出统一响应；`scripts` 和根级 `npm run lint`/`npm run build` 跨项目执行；`.husky` 和 `scripts/check-commit-type.js` 约束提交格式。

## 共享契约（`shared/`）
`shared/api-contracts` 提供以 TypeScript 类型声明为主的 API 契约，前后端都依赖同一份响应结构，避免手写重复定义。后续可以在此目录扩展更多公共类型或自动生成的 SDK。

## 开发流程
1. 根目录执行 `npm install`；进入 `frontend/`、`backend/` 分别安装依赖。
2. 运行 `npm run dev`（前端）或 `npm run start:dev`（后端）联调，或在根目录执行 `npm run build` 快速验证前后端编译是否通过。
3. 提交前执行 `npm run lint` 保证两端规范一致，必要时附上 `npm run test` / `npm run test:e2e` 产出。
