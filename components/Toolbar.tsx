"use client";

import {
  Eraser as ClearIcon,
  Upload as UploadIcon,
} from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import type { UiLanguage } from "@/lib/app-settings";
import { getTargetLanguageOptions, getUiText } from "@/lib/ui-text";
import {
  fetchEngines,
  fetchEngineConfig,
  startTranslation,
  updateAppSettings,
} from "@/services/api";
import { useAppSettingsStore } from "@/stores/app-settings";
import { useTranslationStore } from "@/stores/translation";
import ProviderLogo from "./ProviderLogo";
import AppSelect, { type AppSelectOption } from "./ui/AppSelect";

const DEFAULT_ENGINE_OPTIONS = [
  {
    value: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    builtin: true,
  },
];

function buildTransientEngineOption(engineId: string): AppSelectOption {
  if (engineId === "openai") {
    return DEFAULT_ENGINE_OPTIONS[0];
  }

  if (engineId === "custom-openai" || engineId.startsWith("custom-openai-")) {
    return {
      value: engineId,
      label: "Custom Provider",
      baseUrl: "",
      builtin: false,
    };
  }

  return {
    value: engineId,
    label: engineId,
    baseUrl: "",
    builtin: false,
  };
}

function isMarkdownFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt");
}

export default function Toolbar({
  uiLanguage,
}: {
  uiLanguage?: UiLanguage;
}) {
  const storeUiLanguage = useAppSettingsStore((state) => state.uiLanguage);
  const defaultEngine = useAppSettingsStore((state) => state.defaultEngine);
  const appSettingsHydrated = useAppSettingsStore((state) => state.appSettingsHydrated);
  const resolvedUiLanguage = appSettingsHydrated ? storeUiLanguage : uiLanguage || "en";
  const text = getUiText(resolvedUiLanguage);
  const toolbarText = text.toolbar as ReturnType<typeof getUiText>["toolbar"] & {
    cancel: string;
    notConfigured: string;
    lazyMode: string;
    fullMode: string;
  };
  const targetLanguageOptions = getTargetLanguageOptions(resolvedUiLanguage);
  const {
    engine,
    targetLang,
    mode,
    paragraphs,
    abortController,
    cancelTranslation,
    setEngine,
    setTargetLang,
    setMode,
    setRawInput,
    reset,
  } = useTranslationStore();
  const [engineConfigured, setEngineConfigured] = useState(true);
  const [engineOptions, setEngineOptions] = useState(DEFAULT_ENGINE_OPTIONS);
  const displayEngineOptions = engineOptions.some((option) => option.value === engine)
    ? engineOptions
    : [buildTransientEngineOption(engine), ...engineOptions];

  const translating = Boolean(abortController);
  const canTranslate = paragraphs.length > 0 && !translating;
  const selectedEngine =
    displayEngineOptions.find((option) => option.value === engine) ??
    buildTransientEngineOption(engine);
  const engineSelectWidth = `${Math.min(
    Math.max(selectedEngine.label.length + 2, 10),
    30
  )}ch`;

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const data = await fetchEngines();
        if (!active) {
          return;
        }

        const nextOptions =
          data.engines?.map((item) => ({
            value: item.id,
            label: item.name,
            baseUrl: item.base_url || "",
            builtin: item.builtin ?? item.id === "openai",
          })) || DEFAULT_ENGINE_OPTIONS;

        setEngineOptions(nextOptions);

        const currentEngine = useTranslationStore.getState().engine;
        if (!nextOptions.some((option) => option.value === currentEngine)) {
          setEngine("openai");
        }
      } catch (error) {
        console.error("Failed to load engines:", error);
      }
    })();

    return () => {
      active = false;
    };
  }, [setEngine]);

  useEffect(() => {
    let active = true;

    if (engine === defaultEngine) {
      return () => {
        active = false;
      };
    }

    void updateAppSettings({ default_engine: engine })
      .then((nextSettings) => {
        if (!active) {
          return;
        }

        if (nextSettings.error) {
          console.error("Failed to persist default engine:", nextSettings.error);
          return;
        }

        useAppSettingsStore.getState().applyAppSettings(nextSettings);
      })
      .catch((error) => {
        if (active) {
          console.error("Failed to persist default engine:", error);
        }
      });

    return () => {
      active = false;
    };
  }, [defaultEngine, engine]);

  useEffect(() => {
    let active = true;

    void fetchEngineConfig(engine)
      .then((config) => {
        if (active) {
          setEngineConfigured(config.configured);
        }
      })
      .catch(() => {
        if (active) {
          setEngineConfigured(false);
        }
      });

    return () => {
      active = false;
    };
  }, [engine]);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !isMarkdownFile(file)) {
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const markdown =
        typeof loadEvent.target?.result === "string" ? loadEvent.target.result : "";
      setRawInput(markdown);
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleTranslate = async () => {
    if (!canTranslate) return;

    const { updateParagraph } = useTranslationStore.getState();
    for (const paragraph of paragraphs) {
      updateParagraph(paragraph.id, {
        status:
          paragraph.type === "code" || paragraph.type === "mermaid" ? "done" : "idle",
        translated:
          paragraph.type === "code" || paragraph.type === "mermaid"
            ? paragraph.original
            : "",
        errorMessage: undefined,
      });
    }

    if (mode === "lazy") {
      return;
    }

    try {
      await startTranslation(paragraphs, engine, targetLang, mode);
    } catch (error) {
      console.error("Translation failed:", error);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)] bg-[var(--surface-container-low)] px-4 py-3 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <AppSelect
          value={engine}
          onValueChange={setEngine}
          options={displayEngineOptions}
          ariaLabel="Translation engine"
          leading={
            <ProviderLogo
              engineId={engine}
              label={selectedEngine.label}
              baseUrl={selectedEngine.baseUrl}
            />
          }
          renderOptionLeading={(option: AppSelectOption) => (
            <ProviderLogo
              engineId={option.value}
              label={option.label}
              baseUrl={option.baseUrl}
            />
          )}
          width={engineSelectWidth}
          triggerClassName="px-3 py-2 text-sm font-semibold"
        />

        {!engineConfigured ? (
          <span className="rounded-full bg-[var(--error-container)] px-2 py-1 text-[10px] font-extrabold tracking-[0.14em] text-[var(--error)]">
            {toolbarText.notConfigured}
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => setMode(mode === "lazy" ? "full" : "lazy")}
          className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold tracking-[0.16em] transition ${
            mode === "lazy"
              ? "bg-[var(--secondary-container)] text-[var(--primary)]"
              : "bg-[var(--surface-container-lowest)] text-[var(--on-surface-variant)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]"
          }`}
        >
          {mode === "lazy" ? toolbarText.lazyMode : toolbarText.fullMode}
        </button>

        <AppSelect
          value={targetLang}
          onValueChange={setTargetLang}
          options={targetLanguageOptions}
          ariaLabel="Target language"
          prefix={
            <>
              <span className="rounded-lg bg-[var(--secondary-container)] px-3 py-1.5 text-[var(--primary)]">
                {text.toolbar.auto}
              </span>
              <span className="text-[var(--on-surface-variant)]">{text.toolbar.to}</span>
            </>
          }
          triggerClassName="p-1 text-xs font-extrabold tracking-[0.18em] text-[var(--primary)]"
        />

        <span className="rounded-full bg-[var(--secondary-container)] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[var(--on-surface-variant)]">
          {paragraphs.length} {text.toolbar.paragraphs}
        </span>

        <label
          className="grid h-8 w-11 cursor-pointer place-items-center rounded-xl bg-[var(--primary-container)] text-[var(--surface-container-lowest)] shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--primary)_24%,transparent)] transition hover:bg-[var(--primary)]"
          aria-label={text.toolbar.upload}
          title={text.toolbar.upload}
        >
          <UploadIcon className="h-4 w-4" strokeWidth={1.8} />
          <input
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        <button
          type="button"
          onClick={reset}
          className="grid h-8 w-11 place-items-center rounded-xl bg-[var(--surface-container-lowest)] text-[var(--primary)] shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--primary)_24%,transparent)] transition hover:bg-[var(--surface-container)]"
          aria-label={text.toolbar.clear}
          title={text.toolbar.clear}
        >
          <ClearIcon className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {translating ? (
          <button
            type="button"
            onClick={cancelTranslation}
            className="rounded-full bg-[var(--error-container)] px-7 py-2.5 text-sm font-bold text-[var(--error)] transition hover:opacity-90"
          >
            {toolbarText.cancel}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleTranslate}
            disabled={!canTranslate}
            className="rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] px-7 py-2.5 text-sm font-bold text-[var(--surface-container-lowest)] shadow-[0_16px_32px_rgba(0,82,255,0.22)] transition hover:shadow-[0_20px_42px_rgba(0,82,255,0.32)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {text.toolbar.translate}
          </button>
        )}
      </div>
    </div>
  );
}
