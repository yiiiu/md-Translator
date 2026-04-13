"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  configureEngine,
  deleteEngine,
  fetchEngineConfig,
  fetchEngineModels,
  testEngineModel,
} from "@/services/api";

interface Props {
  engineId: string;
  onClose: () => void;
  onSaved?: () => void;
  onDeleteProvider?: (engineId: string) => void;
}

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o";

function defaultBaseUrlFor(engineId: string) {
  return engineId === "openai" ? DEFAULT_OPENAI_BASE_URL : "";
}

export default function EngineConfig({
  engineId,
  onClose,
  onSaved,
  onDeleteProvider,
}: Props) {
  const [providerName, setProviderName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrlFor(engineId));
  const [models, setModels] = useState<Array<{ id: string }>>([]);
  const [configured, setConfigured] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingModel, setTestingModel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"idle" | "success" | "error">("idle");

  const isCustomEngine = engineId !== "openai";
  const modalTitle = isCustomEngine ? "Custom Openai-Compatible Config" : "Openai Config";
  const modelListId = useMemo(() => `engine-models-${engineId}`, [engineId]);

  useEffect(() => {
    setApiKey("");
    setModel(DEFAULT_MODEL);
    setBaseUrl(defaultBaseUrlFor(engineId));
    setModels([]);
    setShowApiKey(false);
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
      setApiKey(config.api_key || "");
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
    if (!nextApiKey) return;

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
      onSaved?.();
    } catch (error) {
      setStatus("error", error instanceof Error ? error.message : "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isCustomEngine) return;

    setDeleting(true);
    setStatus("idle", null);
    try {
      const result = await deleteEngine(engineId);
      if (!result.ok) {
        setStatus("error", result.error || "Failed to delete provider");
        return;
      }

      onDeleteProvider?.(engineId);
    } catch (error) {
      setStatus("error", error instanceof Error ? error.message : "Failed to delete provider");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={modalTitle}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111c2d]/40 p-4 backdrop-blur-md"
    >
      <div className="custom-scrollbar max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-[#f9f9ff] p-6 shadow-[0_32px_64px_rgba(17,28,45,0.18)] ring-1 ring-[#c3c5d9]/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.24em] text-[#434656]">
              Engine Config
            </p>
            <h2 className="font-headline mt-1 text-2xl font-extrabold tracking-tight text-[#111c2d]">
              {modalTitle}
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              configured ? "bg-[#d5e3fc] text-[#003ec7]" : "bg-white text-[#737688]"
            }`}
          >
            {configured ? "Configured" : "Not configured"}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {isCustomEngine ? (
            <div className="grid gap-4">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-[#434656]">
                  Provider Name
                </span>
                <input
                  type="text"
                  value={providerName}
                  onChange={(event) => setProviderName(event.target.value)}
                  placeholder="Relay Api"
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm outline-none ring-1 ring-[#c3c5d9]/25 transition focus:ring-2 focus:ring-[#0052ff]/25"
                />
              </label>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#434656]">Api Key</span>
            <span className="relative block">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={apiKeyConfigured ? "Stored Api key will be reused" : "sk-..."}
                className="w-full rounded-xl bg-white px-3 py-2 pr-10 text-sm outline-none ring-1 ring-[#c3c5d9]/25 transition focus:ring-2 focus:ring-[#0052ff]/25"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((current) => !current)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1 text-[#737688] transition hover:bg-[#dee8ff] hover:text-[#003ec7]"
                aria-label={showApiKey ? "Hide Api key" : "Show Api key"}
                title={showApiKey ? "Hide Api key" : "Show Api key"}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.8} />
                )}
              </button>
            </span>
            {apiKeyConfigured ? (
              <p className="mt-1 text-xs text-[#737688]">
                Edit the value directly to replace the saved Api key.
              </p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#434656]">Model</span>
            <input
              type="text"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={DEFAULT_MODEL}
              list={modelListId}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm outline-none ring-1 ring-[#c3c5d9]/25 transition focus:ring-2 focus:ring-[#0052ff]/25"
            />
            <datalist id={modelListId}>
              {models.map((item) => (
                <option key={item.id} value={item.id} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-[#737688]">
              Model list is optional. You can always type a model manually.
            </p>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[#434656]">
              Base Url
            </span>
            <input
              type="text"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={
                isCustomEngine ? "https://relay.example.com/v1" : DEFAULT_OPENAI_BASE_URL
              }
              className="w-full rounded-xl bg-white px-3 py-2 text-sm outline-none ring-1 ring-[#c3c5d9]/25 transition focus:ring-2 focus:ring-[#0052ff]/25"
            />
            {isCustomEngine ? (
              <p className="mt-1 text-xs text-[#737688]">
                Provider icon is derived automatically from the Base Url domain.
              </p>
            ) : null}
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleFetchModels}
              disabled={!apiKey.trim() || !baseUrl.trim() || fetchingModels}
              className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#434656] shadow-sm transition hover:bg-[#dee8ff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {fetchingModels ? "Fetching..." : "Fetch Models"}
            </button>
            <button
              type="button"
              onClick={handleTestModel}
              disabled={!apiKey.trim() || !baseUrl.trim() || !model.trim() || testingModel}
              className="rounded-xl bg-[#d5e3fc] px-3 py-2 text-sm font-bold text-[#003ec7] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testingModel ? "Testing..." : "Test Model"}
            </button>
          </div>

          {statusMessage ? (
            <p
              className={`rounded-xl px-3 py-2 text-sm ${
                statusKind === "success"
                  ? "bg-[#d5e3fc] text-[#003ec7]"
                  : "bg-[#ffdad6] text-[#93000a]"
              }`}
            >
              {statusMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          {isCustomEngine ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ffdad6] px-4 py-2 text-sm font-bold text-[#93000a] transition hover:bg-[#ffd0ca] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#434656] shadow-sm transition hover:bg-[#dee8ff]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={(!apiKey.trim() && !apiKeyConfigured) || saving}
              className="rounded-xl bg-gradient-to-br from-[#003ec7] to-[#0052ff] px-4 py-2 text-sm font-bold text-white shadow-[0_14px_28px_rgba(0,82,255,0.22)] transition hover:shadow-[0_18px_36px_rgba(0,82,255,0.32)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
