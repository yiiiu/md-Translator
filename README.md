# Lucid Editor Markdown Translator

Lucid Editor Markdown Translator 是一个面向本地使用的 Markdown 翻译与编辑工作台。项目的核心目标是把“写作、预览、段落级翻译、历史追踪、术语管理和 AI Provider 配置”集中到一个稳定的桌面式 Web 工作流里，减少在多个工具之间来回切换的成本。

它不是 `create-next-app` 的默认模板，而是已经具备固定交互模型、SQLite 持久化、蓝白视觉系统和多 Provider 配置能力的应用项目。

## 背景

Markdown 文档翻译通常会遇到几个实际问题：

- 长文档一次性翻译容易失败，也不方便定位错误段落。
- 代码块、Mermaid、表格、列表等 Markdown 结构需要尽量保留原格式。
- 同一段内容重复翻译会浪费调用次数和时间。
- 项目术语需要统一，否则同一概念在不同段落里容易翻译不一致。
- 不同 OpenAI 兼容服务的 API Key、Base URL 和模型配置需要集中管理。

本项目围绕这些问题实现了一个本地优先的翻译编辑器：先把 Markdown 拆成可追踪段落，再按段翻译、缓存、重试和记录历史。

## 技术栈

- Next.js `16.2.3`，使用 App Router。
- React `19.2.4`。
- Tailwind CSS v4，视觉样式集中在 `app/globals.css` 的项目级 token 中。
- SQLite + `better-sqlite3`，用于保存 Provider 配置、翻译缓存、历史任务、术语库和应用设置。
- Zustand，用于维护运行时编辑器状态和翻译状态。
- `markdown-it`、Shiki、KaTeX、Mermaid，用于 Markdown 预览、代码高亮、数学公式和图表渲染。
- Radix Select，通过项目内的 `AppSelect` 组件封装为统一下拉交互。

## 主要功能

- Markdown 导入：支持粘贴、拖拽和上传 `.md`、`.markdown`、`.txt`、`.mmd`、`.mermaid` 文件。
- 分栏编辑与预览：左侧查看原文，右侧查看翻译结果和渲染后的 Markdown 效果。
- 段落级翻译：按 Markdown 结构拆分段落，代码块和 Mermaid 内容会保留原文。
- 增量翻译流：服务端按有限并发处理翻译分组，段落完成后立即回写状态。
- 翻译缓存：缓存键基于 `content_hash + engine + target_lang`，避免重复翻译相同内容。
- 历史记录：保存翻译任务、段落结果、失败状态和重试同步结果。
- 失败重试与手动重译：失败重试可复用缓存，手动重译会绕过缓存并覆盖同一缓存键。
- 术语库：在设置页维护项目术语，支持查询、筛选、启用/禁用和 CSV 导入。
- AI Provider 管理：支持内置 OpenAI 配置，也支持多个 `custom-openai-*` 兼容 Provider。
- 模型管理：保留手动输入模型和拉取模型列表两种方式。
- 本地设置：界面语言、主题、默认 Provider、默认目标语言、自动翻译等设置持久化到 SQLite。

## 安装与运行

推荐使用 npm。先安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

然后在浏览器中打开：

```text
http://localhost:3000
```

生产构建：

```bash
npm run build
npm run start
```

常用检查：

```bash
npm run lint
```

## 使用前配置

首次使用前，需要进入 `Settings` 页面配置至少一个可用的 AI Provider：

- 内置 `openai` Provider 可配置 API Key、Base URL 和模型。
- 自定义 Provider 会以 `custom-openai-*` 形式创建，适合接入 OpenAI 兼容接口。
- Provider 图标会根据 `base_url` 自动解析，失败时回退到内置图标或首字母。
- 默认 Provider 和默认目标语言会保存到本地 SQLite。

如果只查看 Markdown 预览或测试导入流程，可以暂时不配置 Provider；但实际翻译需要有效 API Key 和模型。

## 数据与缓存

项目使用本地 SQLite 保存长期数据。主要数据包括：

- Provider 配置和加密后的 API Key。
- 翻译缓存。
- 翻译任务和段落结果。
- 术语库。
- 应用设置。

翻译缓存语义固定为：

```text
content_hash + engine + target_lang
```

这意味着同一段原文在同一 Provider 和目标语言下会复用缓存。手动“重新翻译”会绕过缓存并更新缓存结果。

## 注意事项

- 这个项目使用的 Next.js 版本包含破坏性 API 和约定变化。修改 Next.js 相关代码前，应先查看本地文档：

```text
node_modules/next/dist/docs/
```

- 用户界面已有稳定的 Lucid Editor 蓝白视觉系统，除非明确需要，不应随意改设计语言、引入新组件库或偏向暗色主题。
- 用户可见文案集中在 `lib/ui-text.ts`，新增文案时需要同时补充 `en` 和 `zh-CN`。
- 数据库访问应通过 `lib/db.ts` 公共门面完成，不要让业务代码直接绕过门面访问内部 DB 模块。
- Provider 不再支持手动输入 `logo_url`，图标应基于 `base_url` 自动解析。
- 正式产品 UI 中不要使用原生 `<select>` 或 `window.confirm()`，应复用项目内的 `AppSelect` 和 `ConfirmDialog`。
- Markdown 分段器的目标是服务翻译流程，不是完整 Markdown AST 解析器。修改解析规则时要注意段落 ID、历史回放和预览组合的兼容性。
