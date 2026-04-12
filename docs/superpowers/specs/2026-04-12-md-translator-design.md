# MD Translator - Markdown 翻译实时渲染网站

## 概述

一个面向中文开发者的 Markdown 翻译工具，解决阅读 AI 生成的英文设计文档时的语言障碍问题。用户粘贴或上传 Markdown 文档后，系统自动翻译并在左右分栏中对照渲染，支持段落级编辑和多种翻译引擎。

**部署形态**：MVP 定位为单用户本地/个人部署工具。多用户 SaaS 是后续演进方向，不在当前 scope（多用户需要认证体系、密钥隔离、租户数据隔离等，工程量显著增大）。

## 目标用户

中文开发者，经常收到 AI 工具生成的英文设计文档、技术规范、README 等，需要快速翻译阅读。

## 分期计划

| 功能 | V1 (MVP) | V2 扩展 |
|------|----------|---------|
| 翻译引擎 | OpenAI only | + Claude / DeepL / 百度翻译 |
| 翻译模式 | 整篇翻译 | + 按需翻译（lazy） |
| 编辑 | 只读对照 | + 段落级编辑/重翻 |
| MD 渲染 | GFM + 代码高亮 | + 数学公式 (KaTeX) / Mermaid |
| 缓存 | 有 | 有（复用） |
| API Key 存储 | 配置文件（明文） | AES 加密 |

MVP 先验证核心体验（粘贴 → 翻译 → 对照渲染），确认可用后再扩展引擎和交互。

## 核心功能

### 翻译模式

1. **整篇翻译（V1）**：粘贴文档后一次性翻译全部内容，结果通过 SSE 逐段流式返回
2. **按需翻译 lazy（V2）**：用户滚动到哪里翻译到哪里，节省 API 调用
3. **段落级编辑（V2）**：点击任意段落可手动修改译文或重新翻译

### 按需翻译触发策略（V2）

纯"进入 viewport 才翻译"不可行——网络慢时用户会看到大片空白。设计如下：

- 使用 IntersectionObserver 监听每个段落，设置预翻译区域为 viewport 下方 5 段距离
- 段落进入预翻译区域时触发翻译，实际到达 viewport 时大概率已完成
- 同时对 viewport 上方 2 段做预翻译（覆盖回滚场景）
- 滚动事件 200ms debounce，快速滚动时不触发翻译，停下来后批量触发
- 如果用户快速跳到文档末尾，将当前位置附近的段落优先翻译

### 翻译引擎

用户自选。V1 仅 OpenAI（GPT-4o），V2 扩展 Claude、DeepL、百度翻译。

### Markdown 渲染能力

- GFM 标准语法（标题、列表、表格、加粗/斜体等）— V1
- 代码语法高亮（Shiki，多语言）— V1
- 数学公式（KaTeX）— V2
- Mermaid 图表 — V2

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

### 段落解析与 ID 映射

**前端全权负责段落解析和 ID 分配。** 前端将 Markdown 解析为段落列表，每段分配唯一 ID（如 "p-0", "p-1"...），类型标识（heading / paragraph / code / table / list / blockquote / mermaid）。

后端接收的是带 ID 的完整段落列表，只做"分组 → 翻译 → 原样返回 ID + 译文"。**后端不解析、不拆分、不重组。** 这样段落 ID 到翻译结果的映射永远由前端控制，不会出现对不上的问题。

### 分组翻译

整篇上传时，后端将相邻 3-5 个段落打包成一组，带上上下文一起送给翻译 API，翻译结果按原始段落 ID 拆回。

```
用户粘贴整篇文档
    ↓
前端解析为段落列表 [p-0, p-1, p-2, p-3, p-4, p-5...]
    ↓
后端分组：[p-0+p-1+p-2] → API调用1    [p-3+p-4+p-5] → API调用2
    ↓
返回：{p-0: "译文", p-1: "译文", p-2: "译文"} | {p-3: "译文", ...}
    ↓
前端按 ID 匹配 → 左右对照渲染
```

好处：
- 相邻段落一起翻译，上下文不断裂
- 多个分组并发调用 API，速度快
- ID 映射由前端控制，不会错位

### 代码块、表格、Mermaid 的翻译策略

| 类型 | 默认行为 | 说明 |
|------|---------|------|
| 普通代码块 | 不翻译 | 保留原文 |
| Mermaid 图表 | 翻译文字标签 | 识别 type=mermaid 的段落，提取节点文本和 edge label 翻译，保留 Mermaid 语法结构不变 |
| 表格 | 翻译文字内容 | 保留表格结构 |
| 内联代码 | 不翻译 | 如 `code` 保留原样 |

用户可在段落级别手动覆盖默认行为（强制翻译/不翻译）。

### 错误处理

| 场景 | 后端行为 | 前端表现 |
|------|---------|---------|
| API 超时（30s） | 自动重试 1 次，仍失败则返回 error | 段落标记 error，显示原文 + 红色错误提示 + 🔄重试按钮 |
| 限流（429） | 后端排队，指数退避重试 | 段落显示"排队中..."状态 |
| 返回格式异常 | 返回 error + 错误信息 | 段落标记 error，用户点 🔄 手动重试 |
| 网络断开 | — | 顶部显示"连接丢失"横幅，恢复后自动续传未完成段落 |
| 引擎未配置 | 返回 400 | 弹出引擎配置引导 |

段落 error 状态：显示原文，右侧显示错误原因 + 🔄重试按钮。用户可以切换引擎后重试。

## 前端设计

### 页面布局（V1）

```
┌──────────────────────────────────────────────────────────┐
│  顶部工具栏                                               │
│  [目标语言▾] [整篇翻译] [清空]              [设置⚙️]      │
├──────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐       │
│  │    左栏：原文预览      │  │    右栏：译文预览      │       │
│  │    Markdown 渲染      │  │    Markdown 渲染      │       │
│  │                      │  │                      │       │
│  │  # API Design        │  │  # API 设计规范       │       │
│  │  This document...    │  │  本文档描述了...       │       │
│  │  ```python           │  │  ```python           │       │
│  │  def hello():        │  │  def hello():        │       │
│  │  ```                 │  │  ```                 │       │
│  └─────────────────────┘  └─────────────────────┘       │
│                      滚动同步                              │
├──────────────────────────────────────────────────────────┤
│  底部输入区：[粘贴或拖拽 Markdown 文件] [上传.md]           │
└──────────────────────────────────────────────────────────┘
```

V2 布局增加：工具栏多出 [翻译引擎▾] 和 [按需翻译] 按钮；右栏每个段落显示 ✏️编辑 / 🔄重翻 按钮。

### 滚动同步实现

左右两栏段落高度不一致（中文译文通常比英文原文长），纯滚动百分比同步会错位。设计如下：

- 每个段落 DOM 元素带 `data-paragraph-id="p-N"` 属性
- 监听滚动侧的 scroll 事件，找到当前 viewport 顶部最近的段落 ID（即"当前段落"）
- 驱动另一侧滚动到同一段落 ID 的 DOM 元素顶部，实现按段落 ID 对齐
- 用 `requestAnimationFrame` 节流，避免滚动卡顿
- 双向绑定：滚动左侧驱动右侧对齐，滚动右侧驱动左侧对齐，通过 flag 防止循环触发
- 短段落密集区域（如列表项）可合并为一个"段落组"一起对齐，避免高频跳动

```
左栏滚动 → 找到 viewport 顶部对应的段落 p-3
         → 右栏 scrollIntoView 到 p-3 的 DOM 元素
         → 设置 flag 防止右栏 scroll 事件反向触发
```

### 段落状态标识

- `idle`（未翻译）：无特殊标识
- `translating`（翻译中）：段落上方显示 ⏳ 进度条动画
- `done`（已翻译）：段落后方显示 ✓
- `error`（出错）：红色边框 + 错误原因 + 🔄重试按钮
- `edited`（手动编辑过）：段落后方显示 ✏️
- `queued`（排队中）：段落后方显示 "排队中..." 文字（V2 限流场景）

### 前端状态模型 (Pinia)

```typescript
interface Paragraph {
  id: string
  type: 'heading' | 'paragraph' | 'code' | 'table' | 'list' | 'blockquote' | 'mermaid'
  original: string
  translated: string
  status: 'idle' | 'translating' | 'done' | 'error' | 'edited' | 'queued'
  errorMessage?: string
}

interface TranslationStore {
  paragraphs: Paragraph[]
  engine: string
  targetLang: string
  mode: 'full' | 'lazy'
  taskId: string | null
  connectionLost: boolean
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
data: {"paragraph_id": "p-2", "status": "error", "error": "API timeout after retry"}
data: {"type": "complete"}
```

**POST /api/translate/paragraph** — 单段重新翻译（V2）

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

响应：
```json
{"paragraph_id": "p-3", "translated": "本文档..."}
```

**GET /api/engines** — 获取可用引擎列表

响应：
```json
{
  "engines": [
    {"id": "openai", "name": "OpenAI", "configured": true}
  ]
}
```

**POST /api/engines/:id/config** — 配置引擎

请求：
```json
{
  "api_key": "sk-xxx",
  "model": "gpt-4o",
  "base_url": "https://..."
}
```

### 设计决策

- SSE 流式推送，整篇翻译时逐段返回，前端不用等全部完成
- 单段重翻带前后段落上下文，提高翻译质量
- API Key 存后端，前端不接触密钥
- 前端全权负责段落 ID 分配，后端只做 ID 到译文的透传映射
- SSE 中包含 error 事件，前端据此更新段落状态
- SSE 断线续传：后端每翻译完一段就更新 tasks.completed_ids，前端重连 SSE 时调用 GET /api/translate/:task_id 拿到已完成段落列表，跳过已翻译的段落继续推送

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
    id              TEXT PRIMARY KEY,
    status          TEXT DEFAULT 'pending',     -- pending/processing/completed/failed
    engine          TEXT NOT NULL,
    target_lang     TEXT NOT NULL,
    completed_ids   TEXT DEFAULT '[]',          -- JSON array: 已翻译的段落 ID 列表
    failed_ids      TEXT DEFAULT '{}',          -- JSON object: {"p-3": "timeout", ...} 失败段落及原因
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

V1 中 engine_configs.api_key 以明文存配置文件（单用户本地部署），V2 引入 AES 加密。

### 缓存策略

缓存 key = `SHA256(原文内容) + 引擎 + 目标语言`，相同内容不重复调用 API。

## 技术选型

| 层面 | 技术 | 用途 |
|------|------|------|
| 前端框架 | Vue 3 + TypeScript | UI 构建 |
| 状态管理 | Pinia | 段落级翻译状态 |
| Markdown 解析 | markdown-it + 插件 | GFM 渲染 |
| 代码高亮 | Shiki | 多语言语法着色 |
| HTTP 客户端 | fetch + EventSource | API 调用 + SSE |
| 样式 | Tailwind CSS | 快速布局 |
| 后端框架 | Go + net/http | 轻量 HTTP 服务 |
| 路由 | chi | Go HTTP 路由 |
| 数据库 | SQLite (go-sqlite3) | 缓存 + 配置存储 |
| 构建工具 | Vite | 前端开发/打包 |

V2 补充：
| Markdown 扩展 | markdown-it-katex / mermaid.js | 数学公式 / Mermaid 图表 |
| 加密 | crypto/aes | API Key 加密存储 |

## 项目目录结构

```
markdown/
├── frontend/
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.ts
│   │   ├── components/
│   │   │   ├── Toolbar.vue              # 顶部工具栏
│   │   │   ├── EditorPanel.vue          # Markdown 输入区
│   │   │   ├── PreviewPane.vue          # 单栏预览（原文/译文复用）
│   │   │   ├── SplitView.vue            # 左右分栏 + 滚动同步
│   │   │   ├── ParagraphBlock.vue       # 单个段落渲染 + 状态标识（V2: 编辑/重翻）
│   │   │   └── EngineConfig.vue         # 引擎配置弹窗
│   │   ├── stores/
│   │   │   └── translation.ts           # Pinia 翻译状态
│   │   ├── services/
│   │   │   └── api.ts                   # 后端 API 调用 + SSE
│   │   ├── utils/
│   │   │   ├── markdown-parser.ts       # Markdown → 段落列表解析（含 ID 分配）
│   │   │   └── scroll-sync.ts           # 双栏滚动同步
│   │   └── styles/
│   │       └── main.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── main.go                          # 入口，HTTP 路由
│   ├── go.mod
│   ├── handler/
│   │   ├── translate.go                 # POST /api/translate, SSE 推送
│   │   ├── paragraph.go                 # POST /api/translate/paragraph（V2）
│   │   └── engine.go                    # GET /api/engines, POST config
│   ├── engine/
│   │   ├── engine.go                    # 翻译引擎接口定义
│   │   └── openai.go                    # OpenAI adapter（V1）
│   ├── service/
│   │   ├── translator.go               # 分组策略 + 并发调度
│   │   └── cache.go                     # 缓存查询/写入
│   ├── model/
│   │   └── types.go                     # 请求/响应结构体
│   └── db/
│       └── sqlite.go                    # SQLite 初始化 + CRUD
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-04-12-md-translator-design.md
└── README.md
```
