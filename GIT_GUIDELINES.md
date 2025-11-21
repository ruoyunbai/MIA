# Git 工作流

## 分支策略

- `main`：唯一长期分支，直接开发与上线，提交前务必跑 `lint`/`test`。
- 临时分支：偶尔需要并行或大改动时使用 `temp/<name>`、`feature/<name>`，验证完成即合并回 `main` 并删除。

## 提交规范

格式：`<type>: <subject>`。`type` 取 `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`。


feat：新功能
fix：修复 bug
docs：文档更新
style：代码格式（不影响功能，如空格、分号等）
refactor：重构（既不是新增功能，也不是修复 bug）
perf：性能优化
test：添加或修改测试用例
build：构建相关（如修改打包配置）
ci：持续集成相关（如修改 CI 配置文件）
chore：其他杂项（如修改依赖、脚本等）
revert：回滚某次提交

- 标题 ≤ 50 个英文字符，只写结果；正文可选。


示例：

```
feat: init react app
fix: adjust user schema
```


## 自动化


- `commit-msg` 钩子用 Commitlint 校验 `<type>: <subject>`。

