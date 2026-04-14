"use client";

import { useEffect, useRef, useState } from "react";
import { renderMarkdown } from "@/lib/markdown-renderer";
import { resolveThemeMode } from "@/lib/theme";
import { getUiText } from "@/lib/ui-text";
import { retryParagraph } from "@/services/api";
import { useAppSettingsStore } from "@/stores/app-settings";
import { type Paragraph, useTranslationStore } from "@/stores/translation";
import { useMermaidRenderer } from "./MermaidRenderer";

interface Props {
  paragraph: Paragraph;
}

export default function ParagraphBlock({ paragraph }: Props) {
  const { engine, targetLang } = useTranslationStore();
  const uiLanguage = useAppSettingsStore((state) => state.uiLanguage);
  const themeMode = useAppSettingsStore((state) => state.themeMode);
  const paragraphText = getUiText(uiLanguage).paragraph as ReturnType<
    typeof getUiText
  >["paragraph"] & {
    retranslate: string;
  };
  const statusLabels: Partial<Record<Paragraph["status"], string>> = {
    translating: paragraphText.translating,
    error: paragraphText.error,
    edited: paragraphText.edited,
  };
  const content = paragraph.translated || paragraph.original;
  const [renderedContent, setRenderedContent] = useState("");
  const [retrying, setRetrying] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const prefersDark =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;
  const resolvedTheme = resolveThemeMode(themeMode, prefersDark);
  const canRetranslate =
    paragraph.status === "done" || paragraph.status === "edited";

  useMermaidRenderer(articleRef);

  useEffect(() => {
    let active = true;

    void renderMarkdown(content, resolvedTheme).then((html) => {
      if (active) {
        setRenderedContent(html);
      }
    });

    return () => {
      active = false;
    };
  }, [content, resolvedTheme]);

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
      ref={articleRef}
      data-paragraph-id={paragraph.id}
      className={`group relative mx-3 my-1.5 rounded-xl px-4 py-3 transition-colors ${
        paragraph.status === "error"
          ? "bg-[color:color-mix(in_srgb,var(--error-container)_70%,transparent)] text-[var(--error)]"
          : paragraph.status === "translating"
            ? "bg-[color:color-mix(in_srgb,var(--secondary-container)_55%,transparent)]"
            : "hover:bg-[color:color-mix(in_srgb,var(--surface-container-low)_75%,transparent)]"
      }`}
    >
      <div className="pr-20 break-words font-mono text-sm text-[var(--on-surface)]">
        <div
          className="markdown-rendered"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      </div>

      {statusLabel ? (
        <div
          className={`absolute top-3 right-4 rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-[0.18em] ${
            paragraph.status === "error"
              ? "bg-[var(--surface-container-lowest)] text-[var(--error)]"
              : "bg-[var(--secondary-container)] text-[var(--on-surface-variant)]"
          }`}
        >
          {statusLabel}
        </div>
      ) : null}

      {canRetranslate ? (
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          aria-label={paragraphText.retranslate}
          className="absolute top-3 right-12 rounded-full bg-[var(--surface-container-low)] px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-[var(--on-surface-variant)] opacity-0 transition group-hover:opacity-100 hover:bg-[var(--secondary-container)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {retrying ? paragraphText.retrying : paragraphText.retranslate}
        </button>
      ) : null}

      {paragraph.status === "error" ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--error)]">
          {paragraph.errorMessage ? (
            <p className="min-w-0 flex-1">{paragraph.errorMessage}</p>
          ) : null}
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            aria-label={paragraphText.retry}
            className="rounded-full bg-[var(--surface-container-lowest)] px-3 py-1 font-bold text-[var(--error)] shadow-sm transition hover:bg-[var(--error-container)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retrying ? paragraphText.retrying : paragraphText.retry}
          </button>
        </div>
      ) : null}
    </article>
  );
}
