# Project Overview

## 1. Project Goal

Lucid Editor Markdown Translator is a local-first Markdown translation and editing workspace. It centralizes writing, preview, paragraph-level AI translation, translation history, glossary management, cache reuse, and AI Provider configuration in a stable desktop-style Web workflow.

## 2. Tech Stack

### Frontend

- Next.js `16.2.3` with App Router under `app/`.
- React `19.2.4`.
- Tailwind CSS v4 with project-level visual tokens in `app/globals.css`.
- Zustand for runtime editor and translation state.
- Radix Select wrapped by `components/ui/AppSelect.tsx`.
- Markdown preview stack: `markdown-it`, Shiki, KaTeX, and Mermaid.
- Icons: `lucide-react` and `react-icons`.

### Backend

- Next.js App Router API routes under `app/api/*/route.ts`.
- Translation orchestration in `lib/translate.ts`.
- OpenAI-compatible provider implementation in `lib/engines/openai.ts`.
- Server entry pages load initial data from `lib/db.ts` and pass it to client workspace components.

### Database

- Local SQLite database accessed through `better-sqlite3`.
- Database file path: `data/md-translator.db` from `lib/db/connection.ts`.
- Main tables:
  - `engine_configs`
  - `translation_cache`
  - `tasks`
  - `task_paragraphs`
  - `glossary_terms`
  - `app_settings`

### Other Tools

- TypeScript `^5`.
- ESLint `^9` with `eslint-config-next`.
- npm scripts for development, build, start, and lint.
- Local verification scripts under `scripts/check-*.mjs`.
- TODO: 待补充 deployment/packaging strategy if this project later needs a formal release target.

## 3. Architecture

The project uses a Next.js App Router structure. Server pages in `app/*/page.tsx` load persisted settings, history, glossary, and provider data through the `lib/db.ts` database facade, then pass initial data into client workspace components.

Complex UI interaction lives in client components such as `components/HomeWorkspace.tsx`, `components/SettingsWorkspace.tsx`, `components/HistoryWorkspace.tsx`, and related feature components. Runtime translation state is stored in `stores/translation.ts`, while long-lived settings and history are persisted to SQLite.

API routes under `app/api/` handle translation streaming, provider configuration, glossary operations, cache management, history access, settings updates, and paragraph-level retry/sync behavior.

## 4. Core Modules

| Module | Description | Key Files |
|---|---|---|
| Home workspace | Main Markdown input, split editor/preview, toolbar, status bar, and translation workflow entry. | `app/page.tsx`, `components/HomeWorkspace.tsx`, `components/Toolbar.tsx`, `components/SplitView.tsx`, `components/InputArea.tsx`, `stores/translation.ts` |
| Translation pipeline | Paragraph grouping, cache lookup, SSE progress events, retry handling, and OpenAI-compatible provider dispatch. | `app/api/translate/route.ts`, `lib/translate.ts`, `lib/engines/openai.ts`, `lib/cache.ts` |
| Markdown parsing/rendering | Markdown import, paragraph parsing, preview rendering, syntax highlighting, math, and Mermaid support. | `utils/markdown-parser.ts`, `utils/markdown-import.ts`, `lib/markdown-renderer.ts`, `components/PreviewPane.tsx`, `components/MermaidRenderer.tsx` |
| Persistence layer | SQLite connection, schema, migrations, settings, cache, tasks, glossary, and provider config facade. | `lib/db.ts`, `lib/db/connection.ts`, `lib/db/schema.ts`, `lib/db/migrations.ts`, `lib/db/*.ts` |
| Settings workspace | General settings, provider management, glossary management, cache controls, and local UI preferences. | `app/settings/page.tsx`, `components/SettingsWorkspace.tsx`, `components/ProviderSettingsManager.tsx`, `components/GlossaryManager.tsx`, `components/CacheManager.tsx` |
| History workspace | Translation task list, detail view, retry/delete flows, and result synchronization. | `app/history/page.tsx`, `app/history/[taskId]/page.tsx`, `components/HistoryWorkspace.tsx`, `components/HistoryDetail.tsx`, `lib/history.ts` |
| UI system | Stable Lucid Editor blue/white visual language, shared header, select, confirm dialog, toast, and provider logos. | `app/globals.css`, `components/AppHeader.tsx`, `components/ui/AppSelect.tsx`, `components/ui/ConfirmDialog.tsx`, `components/ui/AppToast.tsx`, `components/ProviderLogo.tsx` |
| Localization copy | Centralized user-facing strings and language option helpers. | `lib/ui-text.ts` |

## 5. Run Commands

### Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
npm run start
```

### Test

```bash
npm run lint
```

TODO: 待补充 dedicated test command if the project later adds a formal `npm test` script.

## 6. Important Conventions

* Keep the existing Lucid Editor blue/white visual system from `app/globals.css`; do not casually redesign the product UI.
* Use App Router server pages in `app/*/page.tsx` as entry points and keep complex interactions in client workspace components.
* Persist long-lived settings and history through SQLite via `lib/db.ts`; keep runtime editor state in Zustand stores.
* Database access should go through `lib/db.ts` instead of bypassing the facade.
* Translation cache semantics are based on `content_hash + engine + target_lang`.
* User-facing strings should be centralized in `lib/ui-text.ts`, with both `en` and `zh-CN` entries when new copy is introduced.
* Use `components/ui/AppSelect.tsx` for formal select/dropdown UI and `components/ui/ConfirmDialog.tsx` for destructive confirmations.
* Provider icon resolution is based on `base_url`, with fallback to built-in icon or first letter; do not reintroduce manual `logo_url` input.
* Support multiple `custom-openai-*` providers and legacy `custom-openai` compatibility.
* Global navigation language updates only after settings are saved.
* Before changing Next.js-specific code, read the relevant local guide under `node_modules/next/dist/docs/` because this project uses Next.js `16.2.3`.
* TODO: 待补充 formal authentication/authorization convention if auth is added later; current code inspection did not identify an auth module.

## 7. Source of Truth

This project uses OpenSpec as the long-term source of truth.

Priority order:

1. `openspec/`
2. `AGENTS.md`
3. `.cursor/rules/`
4. `docs/AI_HANDOFF.md`
5. `docs/TASK_STATUS.md`
6. Chat history