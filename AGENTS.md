<!-- BEGIN:openspec-agent-rules -->
# Agent Instructions

This project uses OpenSpec as the long-term source of truth for project context and specifications.

## Read First

Before coding, read these files when relevant:

1. `openspec/project.md`
2. Relevant files under `openspec/specs/`
3. Current change under `openspec/changes/`
4. `.cursor/rules/`
5. `docs/TASK_STATUS.md`
6. `docs/AI_HANDOFF.md`

## Context Priority

Use this priority order:

1. OpenSpec
2. AGENTS.md
3. Cursor rules
4. AI handoff documents
5. Chat history

## Development Rules

* Do not rely only on chat history.
* Inspect current code before modifying.
* Keep changes small and focused.
* Do not rewrite unrelated code.
* Do not introduce new dependencies unless necessary.
* Update task status after meaningful changes.
* Update handoff notes before switching conversations.

## Handoff Rule

`docs/AI_HANDOFF.md` is a current-state snapshot, not a permanent history log.

It should contain:

* Current task
* Current OpenSpec change
* Completed work
* Pending work
* Known blockers
* Key files
* Next steps

It should not contain:

* Full chat history
* Long failed attempts
* Old completed tasks
* Unrelated notes

<!-- END:openspec-agent-rules -->

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Rules

This repository already has a stable UI language and interaction model. Do not redesign it casually.

## Architecture

- Use App Router with server entry pages in `app/*/page.tsx`.
- Server pages should load initial data from `lib/db.ts` and pass it into client workspace components.
- Keep complex interaction logic in client components such as `components/HomeWorkspace.tsx` and `components/SettingsWorkspace.tsx`.
- Persist long-lived settings in SQLite via `lib/db.ts`.
- Keep runtime UI state in `stores/translation.ts`.

## UI Consistency

- Preserve the existing `Lucid Editor` blue/white visual system from `app/globals.css`.
- Reuse existing color tokens, spacing, shadows, and rounded corners.
- Use `font-headline` for major headings.
- Do not introduce a different design language, dark theme bias, or a new component library.

## Required Component Reuse

- Use `components/ui/AppSelect.tsx` for formal select/dropdown UI.
- Use `components/ui/ConfirmDialog.tsx` for destructive confirmations.
- Use `components/ProviderLogo.tsx` for provider icon rendering.
- Use `components/AppHeader.tsx` for top navigation.

## Forbidden By Default

- Do not use native `<select>` for primary UI if `AppSelect` fits.
- Do not use `window.confirm()` in formal product UI.
- Do not reintroduce manual `logo_url` input for providers.
- Do not create parallel duplicate components when an existing component can be extended.

## Navigation And Settings

- Top-level navigation is `Projects`, `History`, `Settings`.
- `Settings` is a first-class page, not a modal.
- `History` remains a standalone page.
- `Glossary` is managed inside `Settings`.
- Global navigation language updates only after settings are saved. Do not change this behavior casually.

## AI Provider Rules

- Support multiple `custom-openai-*` providers and keep legacy `custom-openai` compatibility.
- Provider icon resolution should be based on `base_url`, with fallback to built-in icon or first letter.
- Provider config must support API key, base URL, model, fetch models, test model, create, edit, and delete.
- Model UX should preserve both manual input and selectable model list.

## Data Rules

- Database access should go through `lib/db.ts`.
- Keep current tables and semantics intact: `engine_configs`, `translation_cache`, `tasks`, `glossary_terms`, `app_settings`.
- Translation cache semantics must remain based on `content_hash + engine + target_lang`.

## Text And Localization

- User-facing strings should be centralized in `lib/ui-text.ts`.
- Add both `en` and `zh-CN` when introducing new UI copy.

## Scrollbars

- Reuse the project scrollbar style from `app/globals.css`.
- If a scrollable area falls back to browser-default scrollbar, treat it as a regression unless explicitly intended.

## Verification

Run the checks that match the area you changed.

- Always run `npm run lint`.
- Settings changes: `node scripts/check-settings-page.mjs`
- Glossary / History changes: `node scripts/check-glossary-history-pages.mjs`
- Provider changes: `node scripts/check-multiple-custom-providers.mjs` and `node scripts/check-provider-logos.mjs`
- Split editor layout changes: `node scripts/check-split-editor-layout.mjs`

## Collaboration Notes

- Local commit messages should use Chinese.
- `docs/` is mainly for local collaboration and execution notes. Do not assume docs changes should be committed unless explicitly requested.
- For a fuller project-specific guide, see `docs/项目协作规则.md`.
