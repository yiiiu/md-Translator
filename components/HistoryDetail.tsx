"use client";

import { useEffect, useState } from "react";
import type { Paragraph } from "@/stores/translation";
import { fetchHistoryDetail, type HistoryDetailResponse } from "@/services/api";
import PreviewPane from "./PreviewPane";

export default function HistoryDetail({ taskId }: { taskId: string }) {
  const [detail, setDetail] = useState<HistoryDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void fetchHistoryDetail(taskId)
      .then((response) => {
        if (active) {
          setDetail(response);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [taskId]);

  if (loading) {
    return (
      <div className="grid h-full place-items-center text-sm text-[var(--on-surface-variant)]">
        Loading...
      </div>
    );
  }

  if (!detail?.task) {
    return (
      <div className="grid h-full place-items-center text-sm text-[var(--error)]">
        Task not found or no paragraphs saved.
      </div>
    );
  }

  const originalParagraphs: Paragraph[] = detail.task.paragraphs.map((paragraph) => ({
    id: paragraph.paragraph_id,
    type: paragraph.type as Paragraph["type"],
    original: paragraph.original,
    translated: paragraph.original,
    status: "done",
  }));

  const translatedParagraphs: Paragraph[] = detail.task.paragraphs.map(
    (paragraph) => ({
      id: paragraph.paragraph_id,
      type: paragraph.type as Paragraph["type"],
      original: paragraph.original,
      translated: paragraph.translated || paragraph.original,
      status: "done",
    })
  );

  const handleDownload = () => {
    const content = detail.task!.paragraphs
      .map((paragraph) => paragraph.translated || paragraph.original)
      .join("\n\n");
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `translation-${taskId.slice(0, 8)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <p className="text-xs text-[var(--on-surface-variant)]">
            Engine:{" "}
            <span className="font-bold text-[var(--on-surface)]">
              {detail.task.engine}
            </span>
            {" · "}Target:{" "}
            <span className="font-bold text-[var(--on-surface)]">
              {detail.task.target_lang}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
        >
          Download .md
        </button>
      </div>
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-2 lg:gap-8">
        <PreviewPane
          paragraphs={originalParagraphs}
          title="Original"
          viewMode="preview"
          interactive={false}
        />
        <PreviewPane
          paragraphs={translatedParagraphs}
          title="Translation"
          viewMode="preview"
          interactive={false}
        />
      </div>
    </div>
  );
}
