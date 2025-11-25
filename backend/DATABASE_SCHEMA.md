# 数据库设计文档 (Database Schema)

本项目采用 MySQL 作为主要关系型数据库，ChromaDB 作为向量数据库。以下是 MySQL 数据库的详细表结构设计。

## 1. 用户体系 (User System)

### `users` - 用户表
存储系统中的所有用户信息，支持多渠道登录。

| 字段名         | 类型         | 必填 | 默认值   | 说明                        |
| :------------- | :----------- | :--- | :------- | :-------------------------- |
| `id`           | INT          | 是   | Auto Inc | 主键                        |
| `name`         | VARCHAR(100) | 是   | -        | 用户名/昵称                 |
| `email`        | VARCHAR(255) | 否   | NULL     | 邮箱 (唯一索引)             |
| `phone`        | VARCHAR(20)  | 否   | NULL     | 手机号 (唯一索引)           |
| `passwordHash` | VARCHAR(255) | 否   | NULL     | 密码哈希 (查询时默认不返回) |
| `avatarUrl`    | VARCHAR(500) | 否   | NULL     | 头像链接                    |
| `douyinOpenId` | VARCHAR(100) | 否   | NULL     | 抖音第三方登录 OpenID       |
| `createdAt`    | DATETIME     | 是   | Now      | 创建时间                    |
| `updatedAt`    | DATETIME     | 是   | Now      | 更新时间                    |

### `conversations` - 会话表
存储用户的对话历史列表（即左侧侧边栏）。

| 字段名      | 类型         | 必填 | 默认值   | 说明                            |
| :---------- | :----------- | :--- | :------- | :------------------------------ |
| `id`        | INT          | 是   | Auto Inc | 主键                            |
| `userId`    | INT          | 是   | -        | 外键 -> users.id                |
| `title`     | VARCHAR(255) | 是   | -        | 对话标题                        |
| `isDeleted` | BOOLEAN      | 是   | false    | **软删除标记** (true表示已删除) |
| `createdAt` | DATETIME     | 是   | Now      | 创建时间                        |
| `updatedAt` | DATETIME     | 是   | Now      | 更新时间                        |

### `messages` - 消息表
存储会话中的具体消息内容。

| 字段名           | 类型     | 必填 | 默认值   | 说明                                |
| :--------------- | :------- | :--- | :------- | :---------------------------------- |
| `id`             | INT      | 是   | Auto Inc | 主键                                |
| `conversationId` | INT      | 是   | -        | 外键 -> conversations.id            |
| `role`           | ENUM     | 是   | -        | 角色: 'user', 'assistant', 'system' |
| `content`        | TEXT     | 是   | -        | 消息文本内容                        |
| `sources`        | JSON     | 否   | NULL     | AI 回复时的引用来源 (RAG)           |
| `metadata`       | JSON     | 否   | NULL     | 额外元数据 (如 token 消耗)          |
| `createdAt`      | DATETIME | 是   | Now      | 创建时间                            |

---

## 2. 知识库体系 (Knowledge Base)

### `categories` - 分类表
知识库的目录树结构，支持多级分类（目前限制最多 2 层）。

| 字段名      | 类型         | 必填 | 默认值   | 说明                             |
| :---------- | :----------- | :--- | :------- | :------------------------------- |
| `id`        | INT          | 是   | Auto Inc | 主键                             |
| `name`      | VARCHAR(100) | 是   | -        | 分类名称                         |
| `parentId`  | INT          | 否   | NULL     | 父分类ID (外键 -> categories.id) |
| `userId`    | INT          | 否   | NULL     | 创建者ID (外键 -> users.id)      |
| `level`     | INT          | 是   | 1        | 层级深度 (约束: <= 2)            |
| `sortOrder` | INT          | 是   | 0        | 排序权重                         |
| `path`      | VARCHAR(255) | 是   | ''       | 路径枚举 (如 "0/1/5")            |
| `createdAt` | DATETIME     | 是   | Now      | 创建时间                         |
| `updatedAt` | DATETIME     | 是   | Now      | 更新时间                         |

### `documents` - 文档表
存储知识库文档的元数据和原始内容。

| 字段名        | 类型         | 必填 | 默认值   | 说明                                       |
| :------------ | :----------- | :--- | :------- | :----------------------------------------- |
| `id`          | INT          | 是   | Auto Inc | 主键                                       |
| `title`       | VARCHAR(255) | 是   | -        | 文档标题                                   |
| `content`     | TEXT         | 否   | NULL     | 文档原始内容 (Markdown/Text)               |
| `categoryId`  | INT          | 否   | NULL     | 所属分类 (外键 -> categories.id)           |
| `userId`      | INT          | 否   | NULL     | 所有者ID (外键 -> users.id)                |
| `status`      | ENUM         | 是   | 'active' | 状态: active, inactive, processing, failed |
| `fileUrl`     | VARCHAR(500) | 否   | NULL     | 原始文件下载地址 (如 PDF)                  |
| `metaInfo`    | JSON         | 否   | NULL     | 灵活元数据 (作者, 标签等)                  |
| `contentHash` | VARCHAR(64)  | 否   | NULL     | 内容哈希 (用于去重)                        |
| `createdAt`   | DATETIME     | 是   | Now      | 创建时间                                   |
| `updatedAt`   | DATETIME     | 是   | Now      | 更新时间                                   |

### `document_chunks` - 知识切片表
RAG 核心表，存储文档切分后的片段。

| 字段名       | 类型     | 必填 | 默认值   | 说明                          |
| :----------- | :------- | :--- | :------- | :---------------------------- |
| `id`         | INT      | 是   | Auto Inc | 主键                          |
| `documentId` | INT      | 是   | -        | 外键 -> documents.id          |
| `content`    | TEXT     | 是   | -        | 切片文本内容 (用于 Embedding) |
| `chunkIndex` | INT      | 是   | -        | 在原文中的顺序索引            |
| `tokenCount` | INT      | 是   | 0        | 预估 Token 数量               |
| `metadata`   | JSON     | 否   | NULL     | 切片级元数据                  |
| `createdAt`  | DATETIME | 是   | Now      | 创建时间                      |

### `vector_indices` - 向量索引表
连接 MySQL 数据与 ChromaDB 向量数据的映射表。

| 字段名           | 类型         | 必填 | 默认值   | 说明                                   |
| :--------------- | :----------- | :--- | :------- | :------------------------------------- |
| `id`             | INT          | 是   | Auto Inc | 主键                                   |
| `chunkId`        | INT          | 是   | -        | 外键 -> document_chunks.id             |
| `chromaId`       | VARCHAR(100) | 是   | -        | ChromaDB 中的 UUID                     |
| `embeddingModel` | VARCHAR(100) | 是   | -        | 使用的模型 (如 text-embedding-3-small) |
| `dimension`      | INT          | 是   | 1536     | 向量维度                               |
| `vectorMetadata` | JSON         | 否   | NULL     | 向量存储时的额外元数据                 |

---

## 3. 统计分析 (Analytics)

### `search_logs` - 搜索/问答日志表
用于 Dashboard 统计分析，记录每一次 RAG 检索详情。

| 字段名          | 类型     | 必填 | 默认值   | 说明                      |
| :-------------- | :------- | :--- | :------- | :------------------------ |
| `id`            | INT      | 是   | Auto Inc | 主键                      |
| `userId`        | INT      | 否   | NULL     | 用户ID (外键 -> users.id) |
| `query`         | TEXT     | 是   | -        | 用户提问内容              |
| `resultCount`   | INT      | 是   | 0        | 匹配到的知识点数量        |
| `topScore`      | FLOAT    | 否   | NULL     | 最高匹配分数 (相似度)     |
| `latency`       | INT      | 是   | 0        | 检索耗时 (ms)             |
| `matchedDocIds` | JSON     | 否   | NULL     | 命中的文档ID列表          |
| `createdAt`     | DATETIME | 是   | Now      | 创建时间 (带索引)         |
