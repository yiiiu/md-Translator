"use client";

import { useState } from "react";
import { startTranslation } from "@/services/api";
import { useTranslationStore } from "@/stores/translation";
import EngineConfig from "./EngineConfig";

const TARGET_LANGUAGES = [
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
];

const ENGINE_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "custom-openai", label: "Custom OpenAI-Compatible" },
];

export default function Toolbar() {
  const { engine, targetLang, mode, paragraphs, setEngine, setTargetLang } =
    useTranslationStore();
  const [translating, setTranslating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const canTranslate = paragraphs.length > 0 && !translating;

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
      <header className="border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              MD Translator
            </p>
            <h1 className="text-xl font-semibold text-stone-900">
              实时 Markdown 双栏翻译
            </h1>
          </div>

          <div className="flex-1" />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={engine}
              onChange={(event) => setEngine(event.target.value)}
              className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-blue-500"
            >
              {ENGINE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={targetLang}
              onChange={(event) => setTargetLang(event.target.value)}
              className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-blue-500"
            >
              {TARGET_LANGUAGES.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleTranslate}
              disabled={!canTranslate}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {translating ? "翻译中..." : "开始翻译"}
            </button>

            <button
              onClick={() => setShowConfig(true)}
              className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            >
              Settings
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-500">
          <span className="rounded-full bg-stone-100 px-3 py-1 font-medium">
            {engine.toUpperCase()}
          </span>
          <span>{paragraphs.length} paragraphs</span>
        </div>
      </header>

      {showConfig ? (
        <EngineConfig engineId={engine} onClose={() => setShowConfig(false)} />
      ) : null}
    </>
  );
}
