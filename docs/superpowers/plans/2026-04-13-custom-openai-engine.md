# Custom OpenAI-Compatible Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `custom-openai` engine that works with OpenAI-compatible relay APIs, including custom provider naming, model discovery, manual model entry, and model test.

**Architecture:** Reuse the existing OpenAI-compatible transport and SQLite config storage. Generalize the current OpenAI adapter so `openai` and `custom-openai` both use the same request protocol, then extend the engine config API and UI with model discovery and test actions.

**Tech Stack:** Next.js 16 App Router, TypeScript, better-sqlite3, Zustand, React client components

---

## File Map

| File | Responsibility |
|------|----------------|
| `app/api/engines/route.ts` | Return both built-in engines and configured display names |
| `app/api/engines/[id]/config/route.ts` | Save config for `openai` or `custom-openai` |
| `app/api/engines/[id]/models/route.ts` | Proxy OpenAI-compatible `/models` |
| `app/api/engines/[id]/test/route.ts` | Send a minimal completion request to validate config |
| `lib/engines/openai.ts` | Generalized OpenAI-compatible adapter keyed by engine id |
| `lib/translate.ts` | Create the correct adapter for `openai` or `custom-openai` |
| `services/api.ts` | Frontend helpers for models/test/config |
| `stores/translation.ts` | Keep current engine selection, still default to `openai` |
| `components/Toolbar.tsx` | Add engine selector |
| `components/EngineConfig.tsx` | Add provider name, model fetch, model test, manual model entry |
| `scripts/smoke-custom-openai.mjs` | End-to-end API smoke checks for the new engine |

---

### Task 1: Add Engine Smoke Script First

**Files:**
- Create: `scripts/smoke-custom-openai.mjs`

- [ ] **Step 1: Write the failing smoke script**

Create `scripts/smoke-custom-openai.mjs`:

```javascript
const base = process.env.APP_BASE_URL || "http://127.0.0.1:3000";

async function expectJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${text}`);
  }
  return { response, data };
}

async function main() {
  const engines = await expectJson(`${base}/api/engines`);
  const ids = new Set((engines.data.engines || []).map((engine) => engine.id));

  if (!ids.has("openai")) {
    throw new Error("Expected openai engine");
  }

  if (!ids.has("custom-openai")) {
    throw new Error("Expected custom-openai engine");
  }

  const models = await expectJson(`${base}/api/engines/custom-openai/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: "sk-test",
      base_url: "https://example.com/v1"
    })
  });

  if (typeof models.data.ok !== "boolean") {
    throw new Error("Expected ok boolean from models endpoint");
  }

  const testResult = await expectJson(`${base}/api/engines/custom-openai/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: "sk-test",
      base_url: "https://example.com/v1",
      model: "demo-model"
    })
  });

  if (typeof testResult.data.ok !== "boolean") {
    throw new Error("Expected ok boolean from test endpoint");
  }

  console.log("custom-openai smoke shape checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run the smoke script and verify it fails**

Run:

```bash
node scripts/smoke-custom-openai.mjs
```

Expected: FAIL because `custom-openai` and its endpoints do not exist yet.

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-custom-openai.mjs
git commit -m "test: 添加 custom-openai 冒烟脚本"
```

---

### Task 2: Extend Engine Metadata and Config APIs

**Files:**
- Modify: `app/api/engines/route.ts`
- Modify: `app/api/engines/[id]/config/route.ts`

- [ ] **Step 1: Write the failing API expectation**

Update the smoke script expectation block in `scripts/smoke-custom-openai.mjs` to require `custom-openai` and configured names:

```javascript
  const customEngine = (engines.data.engines || []).find(
    (engine) => engine.id === "custom-openai"
  );

  if (!customEngine) {
    throw new Error("Expected custom-openai engine");
  }

  if (!("configured" in customEngine)) {
    throw new Error("Expected configured flag on custom-openai engine");
  }

  if (!("name" in customEngine)) {
    throw new Error("Expected display name on custom-openai engine");
  }
```

- [ ] **Step 2: Run smoke script to verify it still fails**

Run:

```bash
node scripts/smoke-custom-openai.mjs
```

Expected: FAIL because `GET /api/engines` still returns only `openai`.

- [ ] **Step 3: Implement engine list endpoint**

Replace `app/api/engines/route.ts` with:

```typescript
import { NextResponse } from "next/server";
import { getAllEngineConfigs } from "@/lib/db";

const SUPPORTED_ENGINES = [
  { id: "openai", name: "OpenAI" },
  { id: "custom-openai", name: "Custom OpenAI-Compatible" },
];

export async function GET() {
  const configs = getAllEngineConfigs();
  const configMap = new Map(configs.map((config) => [config.id, config]));

  const engines = SUPPORTED_ENGINES.map((engine) => {
    const configured = configMap.get(engine.id);
    return {
      id: engine.id,
      name: configured?.name || engine.name,
      configured: Boolean(configured?.api_key && (configured?.base_url || engine.id === "openai")),
    };
  });

  return NextResponse.json({ engines });
}
```

- [ ] **Step 4: Implement config save endpoint**

Replace `app/api/engines/[id]/config/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { upsertEngineConfig } from "@/lib/db";

const ENGINE_DEFAULT_NAMES: Record<string, string> = {
  openai: "OpenAI",
  "custom-openai": "Custom OpenAI-Compatible",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!ENGINE_DEFAULT_NAMES[id]) {
    return NextResponse.json({ error: "Unsupported engine" }, { status: 400 });
  }

  if (!body.api_key) {
    return NextResponse.json({ error: "api_key is required" }, { status: 400 });
  }

  if (id === "custom-openai" && !body.base_url) {
    return NextResponse.json({ error: "base_url is required" }, { status: 400 });
  }

  upsertEngineConfig({
    id,
    name: body.name?.trim() || ENGINE_DEFAULT_NAMES[id],
    api_key: body.api_key,
    model: body.model || "",
    base_url: body.base_url || "",
    extra: "{}",
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run lint and smoke checks**

Run:

```bash
npm run lint
node scripts/smoke-custom-openai.mjs
```

Expected: lint PASS, smoke still FAIL at the new `/models` or `/test` calls.

- [ ] **Step 6: Commit**

```bash
git add app/api/engines/route.ts app/api/engines/[id]/config/route.ts scripts/smoke-custom-openai.mjs
git commit -m "feat: 扩展引擎列表与配置接口支持 custom-openai"
```

---

### Task 3: Add Model Discovery and Model Test Endpoints

**Files:**
- Create: `app/api/engines/[id]/models/route.ts`
- Create: `app/api/engines/[id]/test/route.ts`
- Modify: `lib/engines/openai.ts`

- [ ] **Step 1: Tighten the smoke checks**

Update `scripts/smoke-custom-openai.mjs` so `/models` and `/test` must return `{ ok: boolean }` and an `error` string when failing:

```javascript
  if (typeof models.data.ok !== "boolean") {
    throw new Error("Expected ok boolean from models endpoint");
  }
  if (!models.data.ok && typeof models.data.error !== "string") {
    throw new Error("Expected models error message");
  }

  if (typeof testResult.data.ok !== "boolean") {
    throw new Error("Expected ok boolean from test endpoint");
  }
  if (!testResult.data.ok && typeof testResult.data.error !== "string") {
    throw new Error("Expected test error message");
  }
```

- [ ] **Step 2: Run smoke script to verify it fails**

Run:

```bash
node scripts/smoke-custom-openai.mjs
```

Expected: FAIL because the endpoints do not exist yet.

- [ ] **Step 3: Generalize the OpenAI-compatible adapter**

Replace `lib/engines/openai.ts` with:

```typescript
import { getEngineConfig } from "../db";
import { TranslateParagraph, TranslationEngine, TranslationResult } from "./types";

interface OpenAICompatibleModel {
  id: string;
  owned_by?: string;
}

export class OpenAIEngine implements TranslationEngine {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(private engineId: string = "openai") {
    const config = getEngineConfig(engineId);
    if (!config) {
      throw new Error(`${engineId} engine not configured. Please set API key first.`);
    }

    this.apiKey = config.api_key;
    this.model = config.model || "gpt-4o";
    this.baseUrl = config.base_url || "https://api.openai.com/v1";
  }

  static async fetchModels(apiKey: string, baseUrl: string): Promise<OpenAICompatibleModel[]> {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const data = await response.json() as { data?: OpenAICompatibleModel[] };
    return data.data || [];
  }

  static async testModel(apiKey: string, baseUrl: string, model: string): Promise<void> {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "reply with ok" }],
        max_tokens: 5,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }
  }

  async translateBatch(
    paragraphs: TranslateParagraph[],
    targetLang: string,
    signal?: AbortSignal
  ): Promise<TranslationResult[]> {
    const langName = this.getLanguageName(targetLang);
    const combinedText = paragraphs.map((p) => `[${p.id}]: ${p.content}`).join("\n\n");

    const response = await fetch(`${normalizeBaseUrl(this.baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `You are a professional technical document translator. Translate the following Markdown text to ${langName}. Preserve all Markdown formatting exactly and keep the same [paragraph-id]: prefix format.`,
          },
          { role: "user", content: combinedText },
        ],
        temperature: 0.3,
      }),
      signal,
    });

    if (response.status === 429) {
      throw new Error("RATE_LIMITED");
    }

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";
    return this.parseResponse(content, paragraphs);
  }

  private parseResponse(content: string, originalParagraphs: TranslateParagraph[]): TranslationResult[] {
    const results: TranslationResult[] = [];
    const lines = content.split("\n");
    let currentId = "";
    let currentText: string[] = [];

    for (const line of lines) {
      const match = line.match(/^\[([^\]]+)\]:\s*(.*)/);
      if (match) {
        if (currentId) {
          results.push({ paragraphId: currentId, translated: currentText.join("\n").trim() });
        }
        currentId = match[1];
        currentText = [match[2]];
      } else {
        currentText.push(line);
      }
    }

    if (currentId) {
      results.push({ paragraphId: currentId, translated: currentText.join("\n").trim() });
    }

    if (results.length === 0 && originalParagraphs.length > 0) {
      return originalParagraphs.slice(0, 1).map((paragraph) => ({
        paragraphId: paragraph.id,
        translated: content,
      }));
    }

    return results;
  }

  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      "zh-CN": "Simplified Chinese",
      "zh-TW": "Traditional Chinese",
      ja: "Japanese",
      ko: "Korean",
      fr: "French",
      de: "German",
      es: "Spanish",
    };
    return names[code] || code;
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

async function readError(response: Response) {
  const text = await response.text();
  return `OpenAI-compatible API error: ${response.status} - ${text}`;
}
```

- [ ] **Step 4: Add the model discovery route**

Create `app/api/engines/[id]/models/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { OpenAIEngine } from "@/lib/engines/openai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!["openai", "custom-openai"].includes(id)) {
    return NextResponse.json({ ok: false, error: "Unsupported engine" }, { status: 400 });
  }

  if (!body.api_key || !body.base_url) {
    return NextResponse.json(
      { ok: false, error: "api_key and base_url are required" },
      { status: 400 }
    );
  }

  try {
    const models = await OpenAIEngine.fetchModels(body.api_key, body.base_url);
    return NextResponse.json({ ok: true, models });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 200 }
    );
  }
}
```

- [ ] **Step 5: Add the model test route**

Create `app/api/engines/[id]/test/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { OpenAIEngine } from "@/lib/engines/openai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!["openai", "custom-openai"].includes(id)) {
    return NextResponse.json({ ok: false, error: "Unsupported engine" }, { status: 400 });
  }

  if (!body.api_key || !body.base_url || !body.model) {
    return NextResponse.json(
      { ok: false, error: "api_key, base_url, and model are required" },
      { status: 400 }
    );
  }

  try {
    await OpenAIEngine.testModel(body.api_key, body.base_url, body.model);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 200 }
    );
  }
}
```

- [ ] **Step 6: Run verification**

Run:

```bash
npm run lint
npm run build
node scripts/smoke-custom-openai.mjs
```

Expected: lint PASS, build PASS, smoke PASS on response shape.

- [ ] **Step 7: Commit**

```bash
git add app/api/engines/[id]/models/route.ts app/api/engines/[id]/test/route.ts lib/engines/openai.ts scripts/smoke-custom-openai.mjs
git commit -m "feat: 添加模型列表与模型测试接口"
```

---

### Task 4: Route Translation Through the Selected Engine

**Files:**
- Modify: `lib/translate.ts`

- [ ] **Step 1: Add failing engine selection coverage**

Extend `scripts/smoke-custom-openai.mjs` with a translation call using `engine: "custom-openai"` and assert the SSE response contains either a translating event or an error event:

```javascript
  const translation = await fetch(`${base}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      engine: "custom-openai",
      target_lang: "zh-CN",
      mode: "full",
      paragraphs: [
        { id: "p-0", type: "paragraph", content: "Hello world", index: 0 }
      ]
    })
  });

  const translationText = await translation.text();
  if (!translationText.includes("data:")) {
    throw new Error("Expected SSE response for custom-openai translation");
  }
```

- [ ] **Step 2: Run smoke script to verify it fails**

Run:

```bash
node scripts/smoke-custom-openai.mjs
```

Expected: FAIL because translation still only knows the `openai` engine.

- [ ] **Step 3: Implement engine-aware adapter creation**

Replace the `createEngine` function in `lib/translate.ts` with:

```typescript
function createEngine(engineId: string) {
  switch (engineId) {
    case "openai":
    case "custom-openai":
      return new OpenAIEngine(engineId);
    default:
      throw new Error(`Unknown engine: ${engineId}`);
  }
}
```

- [ ] **Step 4: Run verification**

Run:

```bash
npm run lint
node scripts/smoke-custom-openai.mjs
```

Expected: lint PASS, smoke PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/translate.ts scripts/smoke-custom-openai.mjs
git commit -m "feat: 让翻译流程支持 custom-openai 引擎"
```

---

### Task 5: Extend Frontend API Client and Store Usage

**Files:**
- Modify: `services/api.ts`
- Modify: `stores/translation.ts`

- [ ] **Step 1: Write the failing frontend data contract**

Update the type section in `services/api.ts` so the client expects engine model and test helpers:

```typescript
export interface EngineListResponse {
  engines?: Array<{
    id: string;
    name: string;
    configured: boolean;
  }>;
}

export interface EngineModelsResponse {
  ok: boolean;
  models?: Array<{ id: string; owned_by?: string }>;
  error?: string;
}

export interface EngineTestResponse {
  ok: boolean;
  error?: string;
}
```

- [ ] **Step 2: Run lint to verify the new functions are still missing**

Run:

```bash
npm run lint
```

Expected: FAIL until the new helper functions are added and imported correctly.

- [ ] **Step 3: Implement the new API helpers**

Append to `services/api.ts`:

```typescript
export async function fetchEngineModels(
  id: string,
  config: { api_key: string; base_url: string }
): Promise<EngineModelsResponse> {
  const response = await fetch(`/api/engines/${id}/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  return (await response.json()) as EngineModelsResponse;
}

export async function testEngineModel(
  id: string,
  config: { api_key: string; base_url: string; model: string }
): Promise<EngineTestResponse> {
  const response = await fetch(`/api/engines/${id}/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  return (await response.json()) as EngineTestResponse;
}
```

- [ ] **Step 4: Keep the store default and engine setter intact**

Verify `stores/translation.ts` still contains:

```typescript
  engine: "openai",
```

and:

```typescript
  setEngine: (engine) => set({ engine }),
```

No new store fields are required for this task.

- [ ] **Step 5: Run verification**

Run:

```bash
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add services/api.ts stores/translation.ts
git commit -m "feat: 添加 custom-openai 前端 API 调用能力"
```

---

### Task 6: Add Engine Selector and Config Modal Features

**Files:**
- Modify: `components/Toolbar.tsx`
- Modify: `components/EngineConfig.tsx`

- [ ] **Step 1: Write the failing UI expectation**

Update the manual verification checklist comment in `components/Toolbar.tsx` header area:

```tsx
// UI expectation after this task:
// - toolbar shows engine selector
// - config modal can fetch models
// - config modal can test models
// - custom-openai can save a custom display name
```

- [ ] **Step 2: Run lint to verify the new imports/state are not present yet**

Run:

```bash
npm run lint
```

Expected: FAIL after adding new references and before finishing the implementation.

- [ ] **Step 3: Add engine selection to the toolbar**

Update `components/Toolbar.tsx`:

```tsx
const ENGINE_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "custom-openai", label: "Custom OpenAI-Compatible" },
];
```

Use the store setter:

```tsx
const { engine, targetLang, mode, paragraphs, setTargetLang, setEngine } =
  useTranslationStore();
```

Add selector markup before the language selector:

```tsx
<select
  value={engine}
  onChange={(event) => setEngine(event.target.value)}
  className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-blue-500"
>
  {ENGINE_OPTIONS.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))}
</select>
```
```

- [ ] **Step 4: Extend the config modal**

Replace `components/EngineConfig.tsx` with an engine-aware version that:

- receives `engineId` as a prop
- loads engine display name from `fetchEngines()`
- shows a `name` input for `custom-openai`
- keeps free-text `model`
- adds `Fetch Models` and `Test Model` buttons
- shows inline success or error state

Use this prop signature:

```tsx
interface Props {
  engineId: string;
  onClose: () => void;
}
```

Use these local state fields:

```tsx
  const [providerName, setProviderName] = useState("");
  const [models, setModels] = useState<Array<{ id: string }>>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingModel, setTestingModel] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"idle" | "success" | "error">("idle");
```

Add fetch-models handler:

```tsx
  const handleFetchModels = async () => {
    if (!apiKey.trim() || !baseUrl.trim()) return;
    setFetchingModels(true);
    setStatusKind("idle");
    setStatusMessage(null);
    try {
      const result = await fetchEngineModels(engineId, {
        api_key: apiKey,
        base_url: baseUrl,
      });

      if (!result.ok) {
        setModels([]);
        setStatusKind("error");
        setStatusMessage(result.error || "Failed to fetch models");
        return;
      }

      setModels(result.models || []);
      setStatusKind("success");
      setStatusMessage(`Fetched ${result.models?.length || 0} models`);
    } finally {
      setFetchingModels(false);
    }
  };
```

Add test-model handler:

```tsx
  const handleTestModel = async () => {
    if (!apiKey.trim() || !baseUrl.trim() || !model.trim()) return;
    setTestingModel(true);
    setStatusKind("idle");
    setStatusMessage(null);
    try {
      const result = await testEngineModel(engineId, {
        api_key: apiKey,
        base_url: baseUrl,
        model,
      });

      if (!result.ok) {
        setStatusKind("error");
        setStatusMessage(result.error || "Model test failed");
        return;
      }

      setStatusKind("success");
      setStatusMessage("Model test passed");
    } finally {
      setTestingModel(false);
    }
  };
```

Save with engine-aware payload:

```tsx
      await configureEngine(engineId, {
        api_key: apiKey,
        model: model || undefined,
        base_url: baseUrl || undefined,
        name: engineId === "custom-openai" ? providerName || undefined : undefined,
      });
```

- [ ] **Step 5: Pass the selected engine into the modal**

Change the render in `components/Toolbar.tsx` to:

```tsx
{showConfig ? (
  <EngineConfig engineId={engine} onClose={() => setShowConfig(false)} />
) : null}
```

- [ ] **Step 6: Run verification**

Run:

```bash
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/Toolbar.tsx components/EngineConfig.tsx
git commit -m "feat: 添加 custom-openai 配置界面与模型测试"
```

---

### Task 7: Run End-to-End Smoke Verification

**Files:**
- Modify: `scripts/smoke-custom-openai.mjs`

- [ ] **Step 1: Add final smoke coverage**

Expand `scripts/smoke-custom-openai.mjs` to:

```javascript
const configPayload = {
  name: "Relay Test",
  api_key: "sk-test",
  base_url: "https://example.com/v1",
  model: "demo-model"
};

const configResponse = await expectJson(`${base}/api/engines/custom-openai/config`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(configPayload)
});

if (!configResponse.data.ok) {
  throw new Error("Expected config save to succeed");
}
```

Keep the rest of the smoke script checking:

- engine list shape
- models endpoint shape
- test endpoint shape
- translation SSE shape

- [ ] **Step 2: Start the dev server**

Run:

```bash
npm run dev
```

Expected: app starts on `http://localhost:3000`.

- [ ] **Step 3: Run the smoke script against the live app**

Run in a second terminal:

```bash
node scripts/smoke-custom-openai.mjs
```

Expected: PASS on API shape and request flow.

- [ ] **Step 4: Run final automated checks**

Run:

```bash
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/smoke-custom-openai.mjs
git commit -m "test: 完成 custom-openai 端到端冒烟验证"
```

---

## Self-Review

### Spec Coverage

- second engine id: Task 2
- custom provider naming: Task 2 and Task 6
- model list endpoint: Task 3 and Task 6
- manual model entry: Task 6
- model test endpoint: Task 3 and Task 6
- translation through selected engine: Task 4
- final verification: Task 7

### Placeholder Scan

- no placeholder markers remain
- every touched file has a task
- every verification step has an explicit command

### Type Consistency

- engine ids are consistently `openai` and `custom-openai`
- config payload uses `name`, `api_key`, `base_url`, `model`
- response payloads use `ok`, optional `error`, optional `models`
