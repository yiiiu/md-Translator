# MD Translator - Markdown 翻译实时渲染网站

## 概述

一个面向中文开发者的 Markdown 翻译工具，解决阅读 AI 生成的英文设计文档时的语言障碍问题。用户粘贴或上传 Markdown 文档后，系统自动翻译并在左右分栏中对照渲染，支持段落级编辑和多种翻译引擎。

## 目标用户

中文开发者，经常收到 AI 工具生成的英文设计文档、技术规范、README 等，需要快速翻译阅读。

## 核心功能

### 翻译模式

1. **整篇翻译**：粘贴文档后一次性翻译全部内容，结果通过 SSE 逐段流式返回
2. **按需翻译（lazy）**：用户滚动到哪里翻译到哪里，节省 API 调用
3. **段落级编辑**：点击任意段落可手动修改译文或重新翻译

### 翻译引擎

用户自选，MVP 阶段支持四种：
- OpenAI（GPT-4o）
- Claude
- DeepL
- 国内翻译服务（百度翻译等）

### Markdown 渲染能力

- GFM 标准语法（标题、列表、表格、加粗/斜体等）
- 代码语法高亮（Shiki，多语言）
- 数学公式（KaTeX）
- Mermaid 图表

### 输入方式

- 直接粘贴 Markdown 文本
- 拖拽/上传 `.md` 文件

## 整体架构

```
浏览器 (Vue 3)
├── 左栏：原文 Markdown 渲染预览
├── 右栏：译文 Markdown 渲染预览
├── 底部输入区：粘贴/上传
└── 顶部工具栏：引擎选择、语言、模式切换

Go 后端
├── 翻译引擎适配器（统一接口，每个引擎一个 adapter）
├── 段落分组策略 + 并发调度
├── SSE 流式推送
└── SQLite 缓存 + 引擎配置存储
```

前后端分离。Go 后端只负责翻译 API 代理和缓存。段落状态用 Pinia 管理，驱动左右栏同步渲染。翻译引擎用适配器模式，新增引擎只需加一个 adapter。

## 翻译策略

### 段落解析

前端将 Markdown 解析为段落列表（heading / paragraph / code / table / list / blockquote），每个段落有唯一 ID 和类型标识。

### 分组翻译

整篇上传时，后端将相邻 3-5 个段落打包成一组，带上上下文一起送给翻译 API，翻译结果再拆回段落级别存储。

```
用户粘贴整篇文档
    ↓
解析为段落列表 [段1, 段2, 段3, 段4, 段5, 段6...]
    ↓
分组：[段1+段2+段3] → API调用1    [段4+段5+段6] → API调用2
    ↓
结果拆回：段1' 段2' 段3' | 段4' 段5' 段6'
    ↓
存到段落级状态 → 左右对照渲染
```

好处：
- 相邻段落一起翻译，上下文不断裂
- 多个分组并发调用 API，速度快
- 最终存储是段落级，支持单段重翻/编辑

按需模式下，用户滚到哪里才翻译到哪里。

### 代码块和表格

代码块默认保留原文不翻译。表格默认翻译文字内容。用户可手动选择翻译/不翻译。

## 前端设计

### 页面布局

```
┌──────────────────────────────────────────────────────────┐
│  顶部工具栏                                               │
│  [翻译引擎▾] [目标语言▾] [整篇翻译] [按需翻译] [清空]       │
├──────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐       │
│  │    左栏：原文预览      │  │    右栏：译文预览      │       │
│  │    Markdown 渲染      │  │    Markdown 渲染      │       │
│  │                      │  │    每段有 ✏️编辑 🔄重翻 │       │
│  └─────────────────────┘  └─────────────────────┘       │
│                      滚动同步                              │
├──────────────────────────────────────────────────────────┤
│  底部输入区：[粘贴或拖拽 Markdown 文件] [上传.md]           │
└──────────────────────────────────────────────────────────┘
```

### 段落交互

- 每个段落右侧操作按钮：`✏️` 编辑译文、`🔄` 重新翻译
- 段落翻译状态视觉标识：已翻译 ✓ / 翻译中 ⏳ / 未翻译 / 编辑过 ✏️
- 双栏按段落映射同步滚动

### 前端状态模型 (Pinia)

```typescript
interface Paragraph {
  id: string
  type: 'heading' | 'paragraph' | 'code' | 'table' | 'list' | 'blockquote'
  original: string
  translated: string
  status: 'idle' | 'translating' | 'done' | 'error' | 'edited'
}

interface TranslationStore {
  paragraphs: Paragraph[]
  engine: string
  targetLang: string
  mode: 'full' | 'lazy'
  taskId: string | null
}
```

## 后端 API 设计

### 接口列表

**POST /api/translate** — 发起翻译任务

请求：
```json
{
  "engine": "openai",
  "target_lang": "zh-CN",
  "mode": "full",
  "paragraphs": [
    {"id": "p-0", "type": "heading", "content": "# API Design", "index": 0}
  ]
}
```

响应：
```json
{"task_id": "abc123", "status": "processing"}
```

**GET /api/translate/:task_id/events** — SSE 流式推送翻译结果

```
data: {"paragraph_id": "p-0", "status": "done", "translated": "# API 设计规范"}
data: {"paragraph_id": "p-1", "status": "translating"}
data: {"paragraph_id": "p-1", "status": "done", "translated": "本文档描述了..."}
data: {"type": "complete"}
```

**POST /api/translate/paragraph** — 单段重新翻译

请求：
```json
{
  "engine": "openai",
  "target_lang": "zh-CN",
  "paragraph_id": "p-3",
  "content": "This document...",
  "context_before": "前一段原文",
  "context_after": "后一段原文"
}
```

**GET /api/engines** — 获取可用引擎列表

**POST /api/engines/:id/config** — 配置引擎（API Key、model、base_url）

### 设计决策

- SSE 流式推送，整篇翻译时逐段返回，前端不用等全部完成
- 单段重翻带前后段落上下文，提高翻译质量
- API Key 存后端，前端不接触密钥

## 数据模型

### SQLite 表结构

```sql
CREATE TABLE engine_configs (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    api_key     TEXT NOT NULL,
    model       TEXT DEFAULT '',
    base_url    TEXT DEFAULT '',
    extra       TEXT DEFAULT '{}',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE translation_cache (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    content_hash    TEXT NOT NULL,
    engine          TEXT NOT NULL,
    target_lang     TEXT NOT NULL,
    original        TEXT NOT NULL,
    translated      TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(content_hash, engine, target_lang)
);

CREATE TABLE tasks (
    id          TEXT PRIMARY KEY,
    status      TEXT DEFAULT 'pending',
    engine      TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 缓存策略

缓存 key = `SHA256(原文内容) + 引擎 + 目标语言`，相同内容不重复调用 API。

## 技术选型

| 层面 | 技术 | 用途 |
|------|------|------|
| 前端框架 | Vue 3 + TypeScript | UI 构建 |
| 状态管理 | Pinia | 段落级翻译状态 |
| Markdown 解析 | markdown-it + 插件 | GFM/数学公式/Mermaid |
| 代码高亮 | Shiki | 多语言语法着色 |
| HTTP 客户端 | fetch + EventSource | API 调用 + SSE |
| 样式 | Tailwind CSS | 快速布局 |
| 后端框架 | Go + net/http | 轻量 HTTP 服务 |
| 路由 | chi | Go HTTP 路由 |
| 数据库 | SQLite (go-sqlite3) | 缓存 + 配置存储 |
| 加密 | crypto/aes | API Key 加密存储 |

## 项目目录结构

```
markdown/
├── frontend/
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.ts
│   │   ├── components/
│   │   │   ├── Toolbar.vue
│   │   │   ├── EditorPanel.vue
│   │   │   ├── PreviewPane.vue
│   │   │   ├── SplitView.vue
│   │   │   ├── ParagraphBlock.vue
│   │   │   └── EngineConfig.vue
│   │   ├── stores/
│   │   │   └── translation.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── utils/
│   │   │   ├── markdown-parser.ts
│   │   │   └── scroll-sync.ts
│   │   └── styles/
│   │       └── main.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── main.go
│   ├── go.mod
│   ├── handler/
│   │   ├── translate.go
│   │   ├── paragraph.go
│   │   └── engine.go
│   ├── engine/
│   │   ├── engine.go
│   │   ├── openai.go
│   │   ├── claude.go
│   │   ├── deepl.go
│   │   └── baidu.go
│   ├── service/
│   │   ├── translator.go
│   │   └── cache.go
│   ├── model/
│   │   └── types.go
│   └── db/
│       └── sqlite.go
├── docs/
└── README.md
```
