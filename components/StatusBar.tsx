"use client";

import { useState } from "react";
import { retryFailedParagraphs } from "@/services/api";
import { useTranslationStore } from "@/stores/translation";

export default function StatusBar() {
  const { paragraphs, connectionLost, engine, targetLang } = useTranslationStore();
  const [retryingFailures, setRetryingFailures] = useState(false);

  const done = paragraphs.filter((paragraph) => paragraph.status === "done").length;
  const total = paragraphs.length;
  const translating = paragraphs.filter(
    (paragraph) => paragraph.status === "translating"
  ).length;
  const errors = paragraphs.filter((paragraph) => paragraph.status === "error").length;
  const progress = total > 0 ? (done / total) * 100 : 0;
  const canRetryFailures = errors > 0 && !retryingFailures;

  async function handleRetryFailures() {
    if (!canRetryFailures) return;

    setRetryingFailures(true);
    try {
      await retryFailedParagraphs(paragraphs, engine, targetLang);
    } finally {
      setRetryingFailures(false);
    }
  }

  return (
    <footer className="border-t border-stone-200 bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
          <span>
            {done}/{total} translated
          </span>
          {translating > 0 ? <span>{translating} in progress</span> : null}
          {errors > 0 ? (
            <>
              <span>{errors} errors</span>
              <button
                type="button"
                onClick={handleRetryFailures}
                disabled={!canRetryFailures}
                className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-medium text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {retryingFailures ? "重试中..." : `重试失败段落（${errors}）`}
              </button>
            </>
          ) : null}
          {connectionLost ? (
            <span className="font-medium text-red-600">Connection lost</span>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
