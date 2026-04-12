"use client";

import { useTranslationStore } from "@/stores/translation";

export default function StatusBar() {
  const { paragraphs, connectionLost } = useTranslationStore();

  const done = paragraphs.filter((paragraph) => paragraph.status === "done").length;
  const total = paragraphs.length;
  const translating = paragraphs.filter(
    (paragraph) => paragraph.status === "translating"
  ).length;
  const errors = paragraphs.filter((paragraph) => paragraph.status === "error").length;
  const progress = total > 0 ? (done / total) * 100 : 0;

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
          {errors > 0 ? <span>{errors} errors</span> : null}
          {connectionLost ? (
            <span className="font-medium text-red-600">Connection lost</span>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
