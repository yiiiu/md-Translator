"use client";

import {
  CircleHelp as HelpIcon,
  Eraser as ClearIcon,
  Settings as SettingsIcon,
  Upload as UploadIcon,
} from "lucide-react";
import { SiOpenai } from "react-icons/si";
import { useEffect, useState, type ChangeEvent } from "react";
import { fetchEngines, startTranslation } from "@/services/api";
import { useTranslationStore } from "@/stores/translation";
import EngineConfig from "./EngineConfig";
import AppSelect, { type AppSelectOption } from "./ui/AppSelect";

const TARGET_LANGUAGES = [
  { value: "zh-CN", label: "Chinese (Cn)" },
  { value: "zh-TW", label: "Chinese (Tw)" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
];

const DEFAULT_ENGINE_OPTIONS = [
  { value: "openai", label: "Openai", logoUrl: "" },
  { value: "custom-openai", label: "Custom Openai-Compatible", logoUrl: "" },
];

function isMarkdownFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt");
}

function ProviderLogo({
  engineId,
  label,
  logoUrl,
}: {
  engineId: string;
  label: string;
  logoUrl?: string;
}) {
  const normalized = `${engineId} ${label}`.toLowerCase();
  const isOpenAI = engineId === "openai";
  const mark = normalized.includes("custom")
      ? "C"
      : label.trim().charAt(0).toUpperCase() || "A";

  return (
    <span
      aria-label={`${label} provider`}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#111c2d] text-[10px] font-extrabold tracking-[-0.02em] text-white shadow-sm ring-1 ring-[#0052ff]/20"
    >
      {logoUrl ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 rounded-sm bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${logoUrl}")` }}
        />
      ) : isOpenAI ? (
        <SiOpenai className="h-3.5 w-3.5" title="" />
      ) : (
        mark
      )}
    </span>
  );
}

export default function Toolbar() {
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
  const [showConfig, setShowConfig] = useState(false);
  const [engineOptions, setEngineOptions] = useState(DEFAULT_ENGINE_OPTIONS);

  const canTranslate = paragraphs.length > 0 && !translating;
  const selectedEngine =
    engineOptions.find((option) => option.value === engine) ?? DEFAULT_ENGINE_OPTIONS[0];
  const engineSelectWidth = `${Math.min(
    Math.max(selectedEngine.label.length + 2, 10),
    30
  )}ch`;

  const refreshEngineOptions = async () => {
    try {
      const data = await fetchEngines();
      if (!data.engines?.length) return;

      setEngineOptions(
        data.engines.map((item) => ({
          value: item.id,
          label: item.name,
          logoUrl: item.logo_url || "",
        }))
      );
    } catch (error) {
      console.error("Failed to load engines:", error);
    }
  };

  useEffect(() => {
    void refreshEngineOptions();
  }, []);

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

  const handleClear = () => {
    reset();
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
    <>
      <header className="z-20 bg-[#f9f9ff]">
        <div className="flex h-14 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-6">
            <h1 className="font-headline text-lg font-extrabold tracking-tight text-[#0052ff]">
              Lucid Editor
            </h1>
            <nav className="hidden items-center gap-5 text-xs font-bold text-[#434656] md:flex">
              <span className="border-b-2 border-[#003ec7] pb-1 text-[#003ec7]">
                Projects
              </span>
              <span className="transition hover:text-[#003ec7]">Glossary</span>
              <span className="transition hover:text-[#003ec7]">History</span>
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="grid h-9 w-10 place-items-center rounded-xl text-[#434656] transition hover:bg-[#f0f3ff] hover:text-[#003ec7]"
              aria-label="Help"
              title="Help"
            >
              <HelpIcon className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setShowConfig(true)}
              className="grid h-9 w-10 place-items-center rounded-xl text-[#434656] transition hover:bg-[#f0f3ff] hover:text-[#003ec7]"
              aria-label="Settings"
              title="Settings"
            >
              <SettingsIcon className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#111c2d] text-xs font-bold text-white">
              L
            </div>
          </div>
        </div>

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
                  logoUrl={selectedEngine.logoUrl}
                />
              }
              renderOptionLeading={(option: AppSelectOption) => (
                <ProviderLogo
                  engineId={option.value}
                  label={option.label}
                  logoUrl={option.logoUrl}
                />
              )}
              width={engineSelectWidth}
              triggerClassName="px-3 py-2 text-sm font-semibold"
            />

            <AppSelect
              value={targetLang}
              onValueChange={setTargetLang}
              options={TARGET_LANGUAGES}
              ariaLabel="Target language"
              prefix={
                <>
                  <span className="rounded-lg bg-[#d5e3fc] px-3 py-1.5 text-[#003ec7]">
                    Auto
                  </span>
                  <span className="text-[#737688]">to</span>
                </>
              }
              triggerClassName="p-1 text-xs font-extrabold tracking-[0.18em] text-[#003ec7]"
            />

            <span className="rounded-full bg-[#d5e3fc] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[#57657a]">
              {paragraphs.length} paragraphs
            </span>

            <label
              className="grid h-8 w-11 cursor-pointer place-items-center rounded-xl bg-[#0052ff] text-white shadow-sm ring-1 ring-[#003ec7]/20 transition hover:bg-[#003ec7]"
              aria-label="Upload .md"
              title="Upload .md"
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
              onClick={handleClear}
              className="grid h-8 w-11 place-items-center rounded-xl bg-white text-[#003ec7] shadow-sm ring-1 ring-[#003ec7]/20 transition hover:bg-[#dee8ff]"
              aria-label="Clear"
              title="Clear"
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
            {translating ? "Translating..." : "Translate"}
          </button>
        </div>
      </header>

      {showConfig ? (
        <EngineConfig
          engineId={engine}
          onClose={() => {
            setShowConfig(false);
            void refreshEngineOptions();
          }}
        />
      ) : null}
    </>
  );
}
