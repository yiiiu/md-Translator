"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { UiLanguage } from "@/lib/app-settings";
import { formatUiText, getUiText } from "@/lib/ui-text";
import {
  configureEngine,
  deleteEngine,
  fetchEngineConfig,
  fetchEngineModels,
  testEngineModel,
} from "@/services/api";
import ConfirmDialog from "./ui/ConfirmDialog";
import AppSelect, { type AppSelectOption } from "./ui/AppSelect";

interface Props {
  engineId: string;
  embedded?: boolean;
  uiLanguage?: UiLanguage;
  onClose?: () => void;
  onSaved?: (message: string) => void;
  onDeleteProvider?: (engineId: string, message: string) => void;
}

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o";

function defaultBaseUrlFor(engineId: string) {
  return engineId === "openai" ? DEFAULT_OPENAI_BASE_URL : "";
}

export default function EngineConfig({
  engineId,
  embedded = false,
  uiLanguage = "en",
  onClose,
  onSaved,
  onDeleteProvider,
}: Props) {
  const providerText = getUiText(uiLanguage).provider as ReturnType<
    typeof getUiText
  >["provider"] & {
    saved: string;
    deleted: string;
  };
  const [providerName, setProviderName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrlFor(engineId));
  const [models, setModels] = useState<Array<{ id: string }>>([]);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingModel, setTestingModel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"idle" | "success" | "error">("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isCustomEngine = engineId !== "openai";
  const panelTitle = isCustomEngine
    ? providerName.trim() || providerText.customTitle
    : providerText.builtinTitle;
  const dialogCancelLabel = uiLanguage === "zh-CN" ? "取消" : "Cancel";
  const providerDeleteTitle =
    uiLanguage === "zh-CN" ? "删除供应商" : "Delete provider";
  const modelOptions = useMemo<AppSelectOption[]>(() => {
    const options = models.map((item) => ({
      value: item.id,
      label: item.id,
    }));

    if (model.trim() && !options.some((option) => option.value === model.trim())) {
      options.unshift({
        value: model.trim(),
        label: model.trim(),
      });
    }

    if (options.length === 0) {
      options.push({
        value: model.trim() || DEFAULT_MODEL,
        label: model.trim() || DEFAULT_MODEL,
      });
    }

    return options;
  }, [model, models]);

  useEffect(() => {
    setApiKey("");
    setModel(DEFAULT_MODEL);
    setBaseUrl(defaultBaseUrlFor(engineId));
    setModels([]);
    setShowApiKey(false);
    setProviderName("");
    setApiKeyConfigured(false);
    setStatusKind("idle");
    setStatusMessage(null);
  }, [engineId]);

  useEffect(() => {
    let active = true;

    void fetchEngineConfig(engineId).then((config) => {
      if (!active) return;
      if (config.error) {
        setApiKeyConfigured(false);
        return;
      }

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
        setStatus("error", result.error || providerText.fetchFailed);
        return;
      }

      setModels(result.models || []);
      setStatus(
        "success",
        formatUiText(providerText.fetchedModels, {
          count: result.models?.length || 0,
        })
      );
    } catch (error) {
      setModels([]);
      setStatus(
        "error",
        error instanceof Error ? error.message : providerText.fetchFailed
      );
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
        setStatus("error", result.error || providerText.modelFailed);
        return;
      }

      setStatus("success", providerText.modelPassed);
    } catch (error) {
      setStatus(
        "error",
        error instanceof Error ? error.message : providerText.modelFailed
      );
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

      setApiKeyConfigured(true);
      setStatus("success", providerText.saved);
      onSaved?.(providerText.saved);
    } catch (error) {
      setStatus(
        "error",
        error instanceof Error ? error.message : providerText.saveFailed
      );
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
        setStatus("error", result.error || providerText.deleteFailed);
        return;
      }

      setShowDeleteConfirm(false);
      setStatus("success", providerText.deleted);
      onDeleteProvider?.(engineId, providerText.deleted);
    } catch (error) {
      setStatus(
        "error",
        error instanceof Error ? error.message : providerText.deleteFailed
      );
    } finally {
      setDeleting(false);
    }
  };

  const content = (
    <div
      className={
        embedded
          ? "rounded-[1.5rem] bg-[var(--surface-container-lowest)] p-6 shadow-[0_24px_48px_rgba(17,28,45,0.06)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]"
          : "custom-scrollbar max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-[var(--surface)] p-6 shadow-[0_32px_64px_rgba(17,28,45,0.18)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_24%,transparent)]"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.24em] text-[var(--on-surface-variant)]">
            {providerText.sectionTag}
          </p>
          <h2 className="font-headline mt-1 text-2xl font-extrabold tracking-tight text-[var(--on-surface)]">
            {panelTitle}
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {isCustomEngine ? (
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[var(--on-surface-variant)]">
              {providerText.providerName}
            </span>
            <input
              type="text"
              value={providerName}
              onChange={(event) => setProviderName(event.target.value)}
              placeholder={providerText.relayPlaceholder}
              className="w-full rounded-xl bg-[var(--surface-container-lowest)] px-3 py-2 text-sm text-[var(--on-surface)] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] transition placeholder:text-[color:color-mix(in_srgb,var(--on-surface-variant)_75%,transparent)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--primary)_25%,transparent)]"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-sm font-bold text-[var(--on-surface-variant)]">
            {providerText.apiKey}
          </span>
          <span className="relative block">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={apiKeyConfigured ? "sk-..." : "sk-..."}
              className="w-full rounded-xl bg-[var(--surface-container-lowest)] px-3 py-2 pr-10 text-sm text-[var(--on-surface)] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] transition placeholder:text-[color:color-mix(in_srgb,var(--on-surface-variant)_75%,transparent)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--primary)_25%,transparent)]"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((current) => !current)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1 text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container-high)] hover:text-[var(--primary)]"
              aria-label={showApiKey ? providerText.hideApiKey : providerText.showApiKey}
              title={showApiKey ? providerText.hideApiKey : providerText.showApiKey}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4" strokeWidth={1.8} />
              ) : (
                <Eye className="h-4 w-4" strokeWidth={1.8} />
              )}
            </button>
          </span>
          {apiKeyConfigured ? (
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">{providerText.apiKeyHint}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-bold text-[var(--on-surface-variant)]">
            {providerText.model}
          </span>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
            <input
              type="text"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={DEFAULT_MODEL}
              className="w-full rounded-xl bg-[var(--surface-container-lowest)] px-3 py-2 text-sm text-[var(--on-surface)] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] transition placeholder:text-[color:color-mix(in_srgb,var(--on-surface-variant)_75%,transparent)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--primary)_25%,transparent)]"
            />
            <AppSelect
              value={model.trim() || DEFAULT_MODEL}
              onValueChange={setModel}
              options={modelOptions}
              ariaLabel={providerText.model}
              triggerClassName="w-full justify-between bg-[var(--surface-container-lowest)] px-3 py-2 text-sm shadow-none ring-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] hover:bg-[var(--surface-container-low)]"
            />
          </div>
          <p className="mt-1 text-xs text-[var(--on-surface-variant)]">{providerText.modelHint}</p>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-bold text-[var(--on-surface-variant)]">
            {providerText.baseUrl}
          </span>
          <input
            type="text"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder={
              isCustomEngine
                ? providerText.customBaseUrlPlaceholder
                : DEFAULT_OPENAI_BASE_URL
            }
            className="w-full rounded-xl bg-[var(--surface-container-lowest)] px-3 py-2 text-sm text-[var(--on-surface)] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] transition placeholder:text-[color:color-mix(in_srgb,var(--on-surface-variant)_75%,transparent)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--primary)_25%,transparent)]"
          />
          {isCustomEngine ? (
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">{providerText.baseUrlHint}</p>
          ) : null}
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleFetchModels}
            disabled={!apiKey.trim() || !baseUrl.trim() || fetchingModels}
            className="rounded-xl bg-[var(--surface-container-low)] px-3 py-2 text-sm font-bold text-[var(--on-surface-variant)] shadow-sm transition hover:bg-[var(--surface-container-high)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {fetchingModels ? providerText.fetchingModels : providerText.fetchModels}
          </button>
          <button
            type="button"
            onClick={handleTestModel}
            disabled={!apiKey.trim() || !baseUrl.trim() || !model.trim() || testingModel}
            className="rounded-xl bg-[var(--secondary-container)] px-3 py-2 text-sm font-bold text-[var(--primary)] transition hover:bg-[var(--surface-container-high)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testingModel ? providerText.testingModel : providerText.testModel}
          </button>
        </div>

        {statusMessage ? (
          <p
            className={`rounded-xl px-3 py-2 text-sm ${
              statusKind === "success"
                ? "bg-[var(--secondary-container)] text-[var(--primary)]"
                : "bg-[var(--error-container)] text-[var(--error)]"
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
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--error-container)] px-4 py-2 text-sm font-bold text-[var(--error)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.8} />
            {deleting ? providerText.deleting : providerText.delete}
          </button>
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          {!embedded && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[var(--surface-container-lowest)] px-4 py-2 text-sm font-bold text-[var(--on-surface-variant)] shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)] transition hover:bg-[var(--surface-container-high)]"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={(!apiKey.trim() && !apiKeyConfigured) || saving}
            className="rounded-xl bg-gradient-to-br from-[#003ec7] to-[#0052ff] px-4 py-2 text-sm font-bold text-white shadow-[0_14px_28px_rgba(0,82,255,0.22)] transition hover:shadow-[0_18px_36px_rgba(0,82,255,0.32)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {saving ? providerText.saving : providerText.save}
          </button>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <>
        {content}
        <ConfirmDialog
          open={showDeleteConfirm}
          title={providerDeleteTitle}
          description={formatUiText(providerText.deleteConfirm, {
            name: providerName.trim() || panelTitle,
          })}
          confirmLabel={providerText.delete}
          cancelLabel={dialogCancelLabel}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleting}
          tone="danger"
        />
      </>
    );
  }

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={panelTitle}
        className="fixed inset-0 z-50 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--surface)_55%,transparent)] p-4 backdrop-blur-md"
      >
        {content}
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        title={providerDeleteTitle}
        description={formatUiText(providerText.deleteConfirm, {
          name: providerName.trim() || panelTitle,
        })}
        confirmLabel={providerText.delete}
        cancelLabel={dialogCancelLabel}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={deleting}
        tone="danger"
      />
    </>
  );
}
