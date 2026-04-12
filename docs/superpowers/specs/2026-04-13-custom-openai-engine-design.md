# Custom OpenAI-Compatible Engine Design

## Goal

Add a second translation engine, `custom-openai`, for OpenAI-compatible relay APIs.

The user should be able to:

- switch between `openai` and `custom-openai`
- configure `name`, `api_key`, `base_url`, and `model` for `custom-openai`
- fetch model lists from the configured `base_url`
- manually enter a model when `/models` is unsupported
- test whether the selected model is callable before saving

The implementation must preserve the existing `openai` flow and keep translation requests on the current OpenAI-compatible protocol.

## Scope

### In Scope

- add `custom-openai` as a second engine id
- reuse the current OpenAI-compatible request format for both engines
- expose engine selection in the toolbar
- extend the engine config dialog for custom engine naming
- add backend endpoints for model discovery and model test
- support manual model entry when model discovery fails or is unsupported
- return actionable error messages for config, model discovery, and test failures

### Out of Scope

- adding non-OpenAI protocols such as Claude, DeepL, or vendor-specific REST formats
- secret encryption changes
- background reconnect logic redesign
- multi-user configuration management

## Architecture

### Engine Model

The backend will keep `openai` and `custom-openai` as two engine ids in `engine_configs`.

`lib/engines/openai.ts` will be generalized to load config by engine id instead of being hard-coded to `openai`. The implementation still uses:

- `GET {base_url}/models`
- `POST {base_url}/chat/completions`

`openai` remains the default engine. `custom-openai` is a second selectable engine with a user-defined display name.

### API Surface

Keep existing endpoints:

- `GET /api/engines`
- `POST /api/engines/[id]/config`
- `POST /api/translate`

Add new endpoints:

- `POST /api/engines/[id]/models`
- `POST /api/engines/[id]/test`

`POST /api/engines/[id]/models`

- input: `api_key`, `base_url`
- behavior: request the OpenAI-compatible `/models` endpoint
- output: `{ models: [{ id, owned_by? }], ok: true }`
- on failure: `{ ok: false, error }`

`POST /api/engines/[id]/test`

- input: `api_key`, `base_url`, `model`
- behavior: send a minimal `chat/completions` request
- output: `{ ok: true }` when the model responds successfully
- on failure: `{ ok: false, error }`

### UI Flow

Toolbar:

- add engine selector with `OpenAI` and `Custom OpenAI-Compatible`
- changing the selected engine opens the config dialog against that engine id

EngineConfig modal:

- show title based on current engine
- for `custom-openai`, add `name` input
- keep `api_key`, `base_url`, and `model`
- add `Fetch Models` button
- add `Test Model` button
- allow model dropdown selection when models are fetched
- still allow free-text model input at all times

Interaction rules:

1. user fills `base_url` and `api_key`
2. user may click `Fetch Models`
3. if model list succeeds, UI shows selectable models
4. user may still hand-enter any model
5. user clicks `Test Model`
6. if test succeeds, UI shows success state
7. user saves config

Saving is not blocked by a failed model-list fetch. Saving is allowed without model-list support as long as the user manually provides a model.

## Data Model

Reuse the existing `engine_configs` table.

For `custom-openai`:

- `id`: `custom-openai`
- `name`: user-defined display name, default `Custom OpenAI-Compatible`
- `api_key`: relay or provider key
- `model`: selected or manually entered model
- `base_url`: provider base URL
- `extra`: reserved for future use

No schema migration is required.

## Error Handling

### Model Discovery

If `/models` fails:

- show the backend error in the config modal
- keep manual model input enabled
- do not mark the provider as unusable solely because `/models` failed

### Model Test

If the test request fails:

- return the upstream error text when available
- show failure state in the modal
- do not silently swallow transport or auth errors

### Translation

Translation continues to fail fast with per-paragraph SSE errors when the selected engine configuration is invalid.

The existing non-translatable paragraph pass-through behavior remains unchanged.

## Testing

### Automated Verification

- `npm run lint`
- `npm run build`

### Manual Verification

1. configure `custom-openai` with a relay `base_url`
2. fetch models from `/models`
3. manually type a model if `/models` is unsupported
4. test the chosen model
5. save config
6. select `custom-openai` in the toolbar
7. run a translation request and verify SSE results still stream correctly

## Implementation Notes

- keep the transport OpenAI-compatible only
- avoid breaking the existing `openai` engine path
- prefer reusing current engine and config types instead of introducing a new provider abstraction
- keep `custom-openai` naming in the UI while storing a stable engine id in the backend
