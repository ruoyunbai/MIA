# User 接口串联计划

## 背景
- 仓库当前分为 `frontend/`（Vite + React）与 `backend/`（Nest + TypeORM）两个子项目，尚未打通真实接口。
- 前端通过 `AuthModal` + Zustand `useStore` 维护本地的 mock 用户；后端虽然定义了 `User` 实体，但缺少 Controller / Service / Auth 能力，对外没有 `users` 相关 API。
- 目标是优先串联登录 / 用户基础数据的读写，为后续聊天、知识库等能力奠定权限体系与上下文基础。

## 串联目标
1. **后端**：提供注册、登录、获取当前用户信息的 REST API，落库到 `users` 表，并输出稳定的错误码格式。
2. **认证**：首次迭代采用 JWT（或服务器 Session）实现，至少覆盖 Email/密码登录；便于后续扩展到手机号/扫码。
3. **前端**：`AuthModal` 与 `AppShell` 使用真实接口，Zustand `user` 状态改为读取 `/users/me`，Token 生命周期通过 Axios 拦截器管理。
4. **联调**：`npm run dev`（前端）+ `npm run start:dev`（后端）可在 `.env` 中配置网关地址，串联登录链路并补充最小自测脚本。

## 阶段计划与交付
| 阶段 | 目标 | 主要任务 | 产出 | 状态 |
| --- | --- | --- | --- | --- |
| P0 现状梳理 | 统一口径、接口契约 | 补充 `.env.example`、确认口径、落地本文档 | `docs/user-integration-plan.md`、后端环境变量说明 | ✅ |
| P1 后端 User 模块 | 提供用户 CRUD & 登录能力 | 建 `users` module/controller/service`、DTO 校验、密码哈希、错误码 | `/api/users`、`/api/auth/login`、`/api/users/me` 草稿接口 | ✅ 完成 |
| P2 认证与中间件 | 生成/校验 Token | 选择 JWT/Session、实现 Guard、拦截器输出统一响应结构、异常过滤器 | JWT 配置、`AuthGuard`、`CurrentUser` decorator | ⏳ 未开始 |
| P3 前端接入 | `AuthModal` 真正走接口 | `src/api/user.ts` 定义请求、在 `AuthModal`/`RootLayout` 中调用、Token 存储、Axios 拦截器注入 | 可登录/登出 UI，刷新后仍能获取用户信息 | 🚧 进行中 |
| P4 联调 & 测试 | 验证端到端闭环 | 本地起两个服务、Mock DB、补充 e2e/单测、记录自测脚本 | `npm run lint`、`npm run test`/`test:e2e` 报告、前端演示截图 | ⏳ 未开始 |
| P5 监控与交付 | 稳定迭代 & 追踪 | 梳理日志、计划后续扩展（手机号、扫码、权限） | Backlog、后续需求列表 | ⏳ 未开始 |

> 注：阶段可交叉推进，但 P1/P2 是 P3 的前置，建议先完成后端可用接口再切前端改造。

## 接口契约（初稿）
```
POST /api/users
body: { email, password, name? }
resp: { id, email, name, avatarUrl }  // 同时返回 token 可选

POST /api/auth/login
body: { email, password }
resp: { token, user }

GET /api/users/me
headers: Authorization: Bearer <token>
resp: { id, email, name, avatarUrl, createdAt }
```
- 后端响应统一 `{ code, message, data }`，成功 code=0，失败根据场景返回 400/401/409 等业务码。
- 认证失败需返回 401，并在响应头中提示前端清理状态。

## 风险 & 依赖
- **数据库**：需要本地 MySQL；若暂时无法访问，需 mock repository 或使用 SQLite 先打通。
- **密码安全**：需引入 `bcrypt` 等库，注意 Nest CLI 打包体积与编译依赖。
- **CORS/代理**：前端 dev server 需要 `VITE_API_URL` 指向后端或设置 proxy，避免跨域。
- **多终端**：后续扫码/手机号登录将引入第三方 OAuth，需要在 P2 阶段预留扩展点（如统一的 `AuthStrategy` 接口）。

## 近期行动项（Week 1）
1. 生成 `backend/.env.example`，写入 DB/ JWT 配置示例。
2. 搭建 `AuthModule`（Controller + Service + DTO + Guard），完成 `POST /auth/login` 单测。
3. 在前端创建 `src/api/user.ts`，对接登录/获取用户信息接口，准备好 `useStore` 中的持久化逻辑（可选用 `zustand/middleware`）。

完成以上三步后，再根据联调反馈更新本文件状态表。
