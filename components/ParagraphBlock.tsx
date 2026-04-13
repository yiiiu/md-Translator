"use client";

import { useEffect, useState } from "react";
import { renderMarkdown } from "@/lib/markdown-renderer";
import { retryParagraph } from "@/services/api";
import { type Paragraph, useTranslationStore } from "@/stores/translation";

interface Props {
  paragraph: Paragraph;
}

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

  const icon =
    paragraph.status === "translating"
      ? "..."
      : paragraph.status === "done"
        ? "OK"
        : paragraph.status === "error"
          ? "ERR"
          : paragraph.status === "edited"
            ? "EDIT"
          : null;

  async function handleRetry() {
    if (retrying) return;

    setRetrying(true);
    try {
      await retryParagraph(paragraph, engine, targetLang);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <article
      data-paragraph-id={paragraph.id}
      className={`group relative border-l-2 px-4 py-3 transition-colors ${
        paragraph.status === "error"
          ? "border-red-500 bg-red-50/70"
          : "border-transparent hover:bg-stone-100/80"
      }`}
    >
      <div className="pr-16 break-words text-stone-800">
        <div
          className="markdown-rendered"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      </div>
      {icon ? (
        <div className="absolute top-3 right-4 rounded-full border border-stone-300 bg-white px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-stone-500">
          {icon}
        </div>
      ) : null}
      {paragraph.status === "error" ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-red-700">
          {paragraph.errorMessage ? (
            <p className="min-w-0 flex-1">{paragraph.errorMessage}</p>
          ) : null}
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            aria-label="Retry paragraph"
            className="rounded-full border border-red-200 bg-white px-3 py-1 font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retrying ? "重试中..." : "🔄 重试"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
