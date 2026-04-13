"use client";

import { useEffect, useState } from "react";
import { renderMarkdown } from "@/lib/markdown-renderer";
import { retryParagraph } from "@/services/api";
import { type Paragraph, useTranslationStore } from "@/stores/translation";

interface Props {
  paragraph: Paragraph;
}

const statusLabels: Partial<Record<Paragraph["status"], string>> = {
  translating: "SYNC",
  done: "READY",
  error: "ERROR",
  edited: "EDIT",
};

export default function ParagraphBlock({ paragraph }: Props) {
  const content = paragraph.translated || paragraph.original;
  const engine = useTranslationStore((state) => state.engine);
  const targetLang = useTranslationStore((state) => state.targetLang);
  const [renderedContent, setRenderedContent] = useState("");
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let active = true;

    void renderMarkdown(content).then((html) => {
      if (active) {
        setRenderedContent(html);
      }
    });

    return () => {
      active = false;
    };
  }, [content]);

  async function handleRetry() {
    if (retrying) return;

    setRetrying(true);
    try {
      await retryParagraph(paragraph, engine, targetLang);
    } finally {
      setRetrying(false);
    }
  }

  const statusLabel = statusLabels[paragraph.status];

  return (
    <article
      data-paragraph-id={paragraph.id}
      className={`group relative mx-3 my-1.5 rounded-xl px-4 py-3 transition-colors ${
        paragraph.status === "error"
          ? "bg-[#ffdad6]/70 text-[#93000a]"
          : paragraph.status === "translating"
            ? "bg-[#d5e3fc]/55"
            : "hover:bg-[#f0f3ff]"
      }`}
    >
      <div className="pr-20 break-words font-mono text-sm text-[#111c2d]">
        <div
          className="markdown-rendered"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      </div>

      {statusLabel ? (
        <div
          className={`absolute top-3 right-4 rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-[0.18em] ${
            paragraph.status === "error"
              ? "bg-white text-[#ba1a1a]"
              : "bg-[#d5e3fc] text-[#57657a]"
          }`}
        >
          {statusLabel}
        </div>
      ) : null}

      {paragraph.status === "error" ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#93000a]">
          {paragraph.errorMessage ? (
            <p className="min-w-0 flex-1">{paragraph.errorMessage}</p>
          ) : null}
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            aria-label="Retry paragraph"
            className="rounded-full bg-white px-3 py-1 font-bold text-[#ba1a1a] shadow-sm transition hover:bg-[#fff7f6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retrying ? "重试中..." : "重试"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

