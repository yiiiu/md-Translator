"use client";

import { useEffect, useMemo, useState } from "react";
import {
  configureEngine,
  fetchEngineConfig,
  fetchEngineModels,
  testEngineModel,
} from "@/services/api";

interface Props {
  engineId: string;
  onClose: () => void;
}

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o";

function defaultBaseUrlFor(engineId: string) {
  return engineId === "openai" ? DEFAULT_OPENAI_BASE_URL : "";
}

export default function EngineConfig({ engineId, onClose }: Props) {
  const [providerName, setProviderName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrlFor(engineId));
  const [models, setModels] = useState<Array<{ id: string }>>([]);
  const [configured, setConfigured] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingModel, setTestingModel] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"idle" | "success" | "error">("idle");

  const isCustomEngine = engineId === "custom-openai";
  const modalTitle = isCustomEngine ? "Custom OpenAI-Compatible Config" : "OpenAI Config";
  const modelListId = useMemo(() => `engine-models-${engineId}`, [engineId]);

  useEffect(() => {
    setApiKey("");
    setModel(DEFAULT_MODEL);
    setBaseUrl(defaultBaseUrlFor(engineId));
    setModels([]);
    setProviderName("");
    setConfigured(false);
    setApiKeyConfigured(false);
    setStatusKind("idle");
    setStatusMessage(null);
  }, [engineId]);

  useEffect(() => {
    let active = true;

    void fetchEngineConfig(engineId).then((config) => {
      if (!active) return;
      if (config.error) {
        setConfigured(false);
        setApiKeyConfigured(false);
        return;
      }

      setConfigured(config.configured);
      setApiKeyConfigured(config.api_key_configured);
      setModel(config.model || DEFAULT_MODEL);
      setBaseUrl(config.base_url || defaultBaseUrlFor(engineId));
      if (isCustomEngine) {
        setProviderName(config.name || "");
      }
    });

    return () => {
      active = false;
    };
  }, [engineId, isCustomEngine]);

  const setStatus = (kind: "idle" | "success" | "error", message: string | null) => {
    setStatusKind(kind);
    setStatusMessage(message);
  };

  const handleFetchModels = async () => {
    if (!apiKey.trim() || !baseUrl.trim()) return;

    setFetchingModels(true);
    setStatus("idle", null);
    try {
      const result = await fetchEngineModels(engineId, {
        api_key: apiKey,
        base_url: baseUrl,
      });

      if (!result.ok) {
        setModels([]);
        setStatus("error", result.error || "Failed to fetch models");
        return;
      }

      setModels(result.models || []);
      setStatus("success", `Fetched ${result.models?.length || 0} models`);
    } catch (error) {
      setModels([]);
      setStatus("error", error instanceof Error ? error.message : "Failed to fetch models");
    } finally {
      setFetchingModels(false);
    }
  };

  const handleTestModel = async () => {
    if (!apiKey.trim() || !baseUrl.trim() || !model.trim()) return;

    setTestingModel(true);
    setStatus("idle", null);
    try {
      const result = await testEngineModel(engineId, {
        api_key: apiKey,
        base_url: baseUrl,
        model,
      });

      if (!result.ok) {
        setStatus("error", result.error || "Model test failed");
        return;
      }

      setStatus("success", "Model test passed");
    } catch (error) {
      setStatus("error", error instanceof Error ? error.message : "Model test failed");
    } finally {
      setTestingModel(false);
    }
  };

  const handleSave = async () => {
    const nextApiKey = apiKey.trim();
    if (!nextApiKey && !apiKeyConfigured) return;

    setSaving(true);
    setStatus("idle", null);
    try {
      const result = await configureEngine(engineId, {
        api_key: nextApiKey || undefined,
        model: model || undefined,
        base_url: baseUrl || undefined,
        name: isCustomEngine ? providerName || undefined : undefined,
      });

      if (result.error) {
        setStatus("error", result.error);
        return;
      }

      setConfigured(true);
      setApiKeyConfigured(true);
      onClose();
    } catch (error) {
      setStatus("error", error instanceof Error ? error.message : "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={modalTitle}
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Engine Config
            </p>
            <h2 className="mt-1 text-xl font-semibold text-stone-900">{modalTitle}</h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              configured ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
            }`}
          >
            {configured ? "Configured" : "Not configured"}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {isCustomEngine ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">
                Provider Name
              </span>
              <input
                type="text"
                value={providerName}
                onChange={(event) => setProviderName(event.target.value)}
                placeholder="Relay API"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={apiKeyConfigured ? "Stored API key will be reused" : "sk-..."}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
            />
            {apiKeyConfigured ? (
              <p className="mt-1 text-xs text-stone-500">
                Leave blank to keep the saved API key.
              </p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Model</span>
            <input
              type="text"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={DEFAULT_MODEL}
              list={modelListId}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
            />
            <datalist id={modelListId}>
              {models.map((item) => (
                <option key={item.id} value={item.id} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-stone-500">
              Model list is optional. You can always type a model manually.
            </p>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Base URL
            </span>
            <input
              type="text"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={
                isCustomEngine ? "https://relay.example.com/v1" : DEFAULT_OPENAI_BASE_URL
              }
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleFetchModels}
              disabled={!apiKey.trim() || !baseUrl.trim() || fetchingModels}
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {fetchingModels ? "Fetching..." : "Fetch Models"}
            </button>
            <button
              type="button"
              onClick={handleTestModel}
              disabled={!apiKey.trim() || !baseUrl.trim() || !model.trim() || testingModel}
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testingModel ? "Testing..." : "Test Model"}
            </button>
          </div>

          {statusMessage ? (
            <p
              className={`rounded-xl px-3 py-2 text-sm ${
                statusKind === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {statusMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={(!apiKey.trim() && !apiKeyConfigured) || saving}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
