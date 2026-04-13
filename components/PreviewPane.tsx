"use client";

import { Code2 as CodeIcon, Eye as EyeIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RefObject, UIEvent, UIEventHandler } from "react";
import { getUiText } from "@/lib/ui-text";
import { useAppSettingsStore } from "@/stores/app-settings";
import { type Paragraph, useTranslationStore } from "@/stores/translation";
import ParagraphBlock from "./ParagraphBlock";

interface Props {
  paragraphs: Paragraph[];
  title: string;
  containerRef?: RefObject<HTMLDivElement | null>;
  onScroll?: UIEventHandler<HTMLDivElement>;
  emptyState?: string;
  viewMode?: "preview" | "code";
}

function formatLineNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

export default function PreviewPane({
  paragraphs,
  title,
  containerRef,
  onScroll,
  emptyState,
  viewMode = "preview",
}: Props) {
  const uiLanguage = useAppSettingsStore((state) => state.uiLanguage);
  const text = getUiText(uiLanguage).splitView;
  const isTranslation =
    title === text.translation || title.toLowerCase() === "translation" || title === "译文";
  const updateParagraph = useTranslationStore((state) => state.updateParagraph);
  const codeLineNumberRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState(viewMode);
  const outputMarkdown = paragraphs
    .map((paragraph) => paragraph.translated || paragraph.original)
    .join("\n\n");
  const [codeDraft, setCodeDraft] = useState(outputMarkdown);
  const codeLineCount = Math.max(1, codeDraft.split("\n").length);
  const nextEmptyState = emptyState || text.empty;

  useEffect(() => {
    setMode(viewMode);
  }, [viewMode]);

  useEffect(() => {
    setCodeDraft(outputMarkdown);
  }, [outputMarkdown]);

  const handleCodeScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (codeLineNumberRef.current) {
      codeLineNumberRef.current.scrollTop = event.currentTarget.scrollTop;
    }
  };

  const handleCodeChange = (value: string) => {
    setCodeDraft(value);

    const parts = value.split(/\n\s*\n/);
    paragraphs.forEach((paragraph, index) => {
      updateParagraph(paragraph.id, {
        translated: parts[index] ?? "",
        status: "edited",
      });
    });
  };

  const handleCopy = async () => {
    if (!outputMarkdown) return;
    await navigator.clipboard.writeText(outputMarkdown);
  };

  const handleDownload = () => {
    if (!outputMarkdown) return;

    const blob = new Blob([outputMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "translation.md";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between px-2">
        <span
          className={`text-[10px] font-extrabold tracking-[0.24em] ${
            isTranslation ? "text-[var(--primary)]" : "text-[var(--on-surface-variant)]"
          }`}
        >
          {title}
        </span>
        <div className="flex items-center gap-2">
          {isTranslation ? (
            <>
              <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-container-lowest)] p-0.5 ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_24%,transparent)]">
                <button
                  type="button"
                  onClick={() => setMode("preview")}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold tracking-[0.14em] transition ${
                    mode === "preview"
                      ? "bg-[var(--secondary-container)] text-[var(--primary)]"
                      : "text-[var(--on-surface-variant)] hover:text-[var(--primary)]"
                  }`}
                >
                  <EyeIcon className="h-3 w-3" strokeWidth={1.8} />
                  {text.preview}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("code")}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold tracking-[0.14em] transition ${
                    mode === "code"
                      ? "bg-[var(--secondary-container)] text-[var(--primary)]"
                      : "text-[var(--on-surface-variant)] hover:text-[var(--primary)]"
                  }`}
                >
                  <CodeIcon className="h-3 w-3" strokeWidth={1.8} />
                  {text.code}
                </button>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!outputMarkdown}
                className="rounded-full px-2 py-1 text-xs font-bold text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container-high)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-45"
                aria-label={text.copy}
              >
                {text.copy}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!outputMarkdown}
                className="rounded-full px-2 py-1 text-xs font-bold text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container-high)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-45"
                aria-label={text.save}
              >
                {text.save}
              </button>
            </>
          ) : (
            <span className="rounded-md bg-[var(--surface-container-lowest)] px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-[var(--on-surface-variant)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_24%,transparent)]">
              {text.fileName}
            </span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={mode === "preview" ? onScroll : undefined}
        className={`surface-pane custom-scrollbar flex min-h-0 flex-1 rounded-xl ${
          mode === "code" ? "overflow-hidden" : "overflow-y-auto"
        } ${
          isTranslation
            ? "ring-1 ring-[color:color-mix(in_srgb,var(--primary)_18%,transparent)]"
            : "ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]"
        }`}
      >
        {mode === "code" ? (
          <div className="grid min-h-0 flex-1 grid-cols-[3.25rem_minmax(0,1fr)]">
            <div
              ref={codeLineNumberRef}
              aria-hidden="true"
              className="line-number-gutter overflow-hidden py-3 text-center text-[10px] leading-5"
            >
              {Array.from({ length: codeLineCount }, (_, index) => (
                <div key={index}>{formatLineNumber(index)}</div>
              ))}
            </div>
            <textarea
              value={codeDraft}
              onChange={(event) => handleCodeChange(event.target.value)}
              onScroll={handleCodeScroll}
              placeholder={nextEmptyState}
              className="custom-scrollbar min-h-0 flex-1 resize-none overflow-y-auto bg-transparent px-4 py-3 font-mono text-xs leading-5 text-[var(--on-surface)] outline-none placeholder:text-[color:color-mix(in_srgb,var(--on-surface-variant)_55%,white)]"
            />
          </div>
        ) : paragraphs.length === 0 ? (
          <div className="grid min-h-full flex-1 place-items-center px-8 py-16 text-center text-sm text-[var(--on-surface-variant)]">
            {nextEmptyState}
          </div>
        ) : (
          <div className="min-w-0 flex-1 py-3">
            {paragraphs.map((paragraph) => (
              <ParagraphBlock key={paragraph.id} paragraph={paragraph} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
