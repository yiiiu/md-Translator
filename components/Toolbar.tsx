"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { fetchEngines, startTranslation } from "@/services/api";
import { useTranslationStore } from "@/stores/translation";
import EngineConfig from "./EngineConfig";

const TARGET_LANGUAGES = [
  { value: "zh-CN", label: "Chinese (CN)" },
  { value: "zh-TW", label: "Chinese (TW)" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
];

const DEFAULT_ENGINE_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "custom-openai", label: "Custom OpenAI-Compatible" },
];

function isMarkdownFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt");
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

  const refreshEngineOptions = async () => {
    try {
      const data = await fetchEngines();
      if (!data.engines?.length) return;

      setEngineOptions(
        data.engines.map((item) => ({
          value: item.id,
          label: item.name,
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full text-[#434656] transition hover:bg-[#f0f3ff] hover:text-[#003ec7]"
              aria-label="Help"
            >
              ?
            </button>
            <button
              type="button"
              onClick={() => setShowConfig(true)}
              className="rounded-full px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#434656] transition hover:bg-[#f0f3ff] hover:text-[#003ec7]"
              aria-label="Settings"
            >
              Settings
            </button>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#111c2d] text-xs font-bold text-white">
              L
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f0f3ff] px-4 py-3 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#111c2d] shadow-sm ring-1 ring-[#c3c5d9]/15">
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#003ec7]">
                Engine
              </span>
              <select
                value={engine}
                onChange={(event) => setEngine(event.target.value)}
                className="bg-transparent text-sm font-semibold outline-none"
                aria-label="Translation engine"
              >
                {engineOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-2 rounded-xl bg-white p-1 text-xs font-extrabold uppercase tracking-[0.18em] text-[#003ec7] shadow-sm ring-1 ring-[#c3c5d9]/15">
              <span className="rounded-lg bg-[#d5e3fc] px-3 py-1.5">Auto</span>
              <span className="text-[#737688]">to</span>
              <select
                value={targetLang}
                onChange={(event) => setTargetLang(event.target.value)}
                className="rounded-lg bg-transparent px-2 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] outline-none transition hover:bg-[#dee8ff]"
                aria-label="Target language"
              >
                {TARGET_LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </div>

            <span className="rounded-full bg-[#d5e3fc] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#57657a]">
              {paragraphs.length} paragraphs
            </span>

            <label className="cursor-pointer rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#515f74] transition hover:bg-[#dee8ff] hover:text-[#003ec7]">
              Upload .md
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
              className="rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#515f74] transition hover:bg-[#dee8ff] hover:text-[#003ec7]"
            >
              Clear
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
