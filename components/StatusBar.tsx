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
    <section className="rounded-xl bg-[#e7eeff] p-3 ring-1 ring-[#c3c5d9]/10">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[#737688]">▣</span>
          <span className="text-[10px] font-extrabold tracking-[0.24em] text-[#434656]">
            Translation Logs
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
              {retryingFailures ? "重试中..." : `重试失败段落（${errors}）`}
            </button>
          ) : null}
          <span className="text-[10px] font-extrabold tracking-[0.18em] text-[#003ec7]">
            {connectionLost ? "Connection Lost" : "Ready"}
          </span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="custom-scrollbar h-16 overflow-y-auto font-mono text-[11px] leading-5 text-[#434656]">
          <p>
            <span className="text-[#737688]/70">[status]</span>{" "}
            {total > 0
              ? `Parsed ${total} paragraph buffers.`
              : "Waiting for Markdown input."}
          </p>
          <p>
            <span className="text-[#737688]/70">[translate]</span>{" "}
            {done}/{total} translated
            {translating > 0 ? `, ${translating} in progress` : ""}
            {errors > 0 ? `, ${errors} errors` : ""}
          </p>
          {connectionLost ? (
            <p className="text-[#ba1a1a]">
              <span className="text-[#737688]/70">[network]</span> Stream connection lost.
            </p>
          ) : (
            <p>
              <span className="text-[#737688]/70">[workspace]</span> Applying rendered
              Markdown output to buffers.
            </p>
          )}
        </div>

        <div className="min-w-44">
          <div className="mb-1 flex items-center justify-between text-[10px] font-extrabold tracking-[0.14em] text-[#434656]">
            <span>Progress</span>
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
