"use client";

import {
  Eraser as ClearIcon,
  Upload as UploadIcon,
} from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import type { UiLanguage } from "@/lib/app-settings";
import { getTargetLanguageOptions, getUiText } from "@/lib/ui-text";
import { fetchEngines, startTranslation } from "@/services/api";
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

function isMarkdownFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt");
}

export default function Toolbar({ uiLanguage }: { uiLanguage: UiLanguage }) {
  const text = getUiText(uiLanguage);
  const targetLanguageOptions = getTargetLanguageOptions(uiLanguage);
  const {
    engine,
    targetLang,
    mode,
    paragraphs,
    setEngine,
    setTargetLang,
    setRawInput,
    reset,
  } = useTranslationStore();
  const [translating, setTranslating] = useState(false);
  const [engineOptions, setEngineOptions] = useState(DEFAULT_ENGINE_OPTIONS);

  const canTranslate = paragraphs.length > 0 && !translating;
  const selectedEngine =
    engineOptions.find((option) => option.value === engine) ?? DEFAULT_ENGINE_OPTIONS[0];
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

    setTranslating(true);

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

    try {
      await startTranslation(paragraphs, engine, targetLang, mode);
    } catch (error) {
      console.error("Translation failed:", error);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f0f3ff] px-4 py-3 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <AppSelect
          value={engine}
          onValueChange={setEngine}
          options={engineOptions}
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

        <AppSelect
          value={targetLang}
          onValueChange={setTargetLang}
          options={targetLanguageOptions}
          ariaLabel="Target language"
          prefix={
            <>
              <span className="rounded-lg bg-[#d5e3fc] px-3 py-1.5 text-[#003ec7]">
                {text.toolbar.auto}
              </span>
              <span className="text-[#737688]">{text.toolbar.to}</span>
            </>
          }
          triggerClassName="p-1 text-xs font-extrabold tracking-[0.18em] text-[#003ec7]"
        />

        <span className="rounded-full bg-[#d5e3fc] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[#57657a]">
          {paragraphs.length} {text.toolbar.paragraphs}
        </span>

        <label
          className="grid h-8 w-11 cursor-pointer place-items-center rounded-xl bg-[#0052ff] text-white shadow-sm ring-1 ring-[#003ec7]/20 transition hover:bg-[#003ec7]"
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
          className="grid h-8 w-11 place-items-center rounded-xl bg-white text-[#003ec7] shadow-sm ring-1 ring-[#003ec7]/20 transition hover:bg-[#dee8ff]"
          aria-label={text.toolbar.clear}
          title={text.toolbar.clear}
        >
          <ClearIcon className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      <button
        type="button"
        onClick={handleTranslate}
        disabled={!canTranslate}
        className="rounded-full bg-gradient-to-br from-[#003ec7] to-[#0052ff] px-7 py-2.5 text-sm font-bold text-white shadow-[0_16px_32px_rgba(0,82,255,0.22)] transition hover:shadow-[0_20px_42px_rgba(0,82,255,0.32)] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {translating ? text.toolbar.translating : text.toolbar.translate}
      </button>
    </div>
  );
}
