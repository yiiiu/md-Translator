"use client";

import { Activity } from "lucide-react";
import { useState } from "react";
import { formatUiText, getUiText } from "@/lib/ui-text";
import { retryFailedParagraphs } from "@/services/api";
import { useTranslationStore } from "@/stores/translation";

export default function StatusBar() {
  const { paragraphs, connectionLost, engine, targetLang, uiLanguage } =
    useTranslationStore();
  const text = getUiText(uiLanguage).statusBar;
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
    <section className="rounded-xl bg-[#e7eeff] p-3 ring-1 ring-[#c3c5d9]/10">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-[#737688]" strokeWidth={1.8} />
          <span className="text-[10px] font-extrabold tracking-[0.24em] text-[#434656]">
            {text.title}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {errors > 0 ? (
            <button
              type="button"
              onClick={handleRetryFailures}
              disabled={!canRetryFailures}
              className="rounded-full bg-white px-3 py-1 text-[10px] font-extrabold tracking-[0.12em] text-[#ba1a1a] shadow-sm transition hover:bg-[#ffdad6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retryingFailures ? text.retrying : `${text.retryFailed} (${errors})`}
            </button>
          ) : null}
          <span className="text-[10px] font-extrabold tracking-[0.18em] text-[#003ec7]">
            {connectionLost ? text.connectionLost : text.ready}
          </span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="custom-scrollbar h-16 overflow-y-auto font-mono text-[11px] leading-5 text-[#434656]">
          <p>
            <span className="text-[#737688]/70">[status]</span>{" "}
            {total > 0
              ? formatUiText(text.parsed, { count: total })
              : text.waiting}
          </p>
          <p>
            <span className="text-[#737688]/70">[translate]</span>{" "}
            {formatUiText(text.translated, { done, total })}
            {translating > 0
              ? `, ${formatUiText(text.inProgress, { count: translating })}`
              : ""}
            {errors > 0 ? `, ${formatUiText(text.errors, { count: errors })}` : ""}
          </p>
          {connectionLost ? (
            <p className="text-[#ba1a1a]">
              <span className="text-[#737688]/70">[network]</span> {text.streamLost}
            </p>
          ) : (
            <p>
              <span className="text-[#737688]/70">[workspace]</span> {text.applying}
            </p>
          )}
        </div>

        <div className="min-w-44">
          <div className="mb-1 flex items-center justify-between text-[10px] font-extrabold tracking-[0.14em] text-[#434656]">
            <span>{text.progress}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#d8e3fb]">
            <div
              className="h-full rounded-full bg-[#003ec7] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
