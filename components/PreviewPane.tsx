"use client";

import { useEffect, useState } from "react";
import type { RefObject, UIEventHandler } from "react";
import { type Paragraph } from "@/stores/translation";
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
  emptyState = "Paste Markdown below, or upload a .md file to start.",
  viewMode = "preview",
}: Props) {
  const isTranslation = title.toLowerCase() === "translation";
  const [mode, setMode] = useState(viewMode);
  const outputMarkdown = paragraphs
    .map((paragraph) => paragraph.translated || paragraph.original)
    .join("\n\n");

  useEffect(() => {
    setMode(viewMode);
  }, [viewMode]);

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
          className={`text-[10px] font-extrabold uppercase tracking-[0.24em] ${
            isTranslation ? "text-[#003ec7]" : "text-[#434656]"
          }`}
        >
          {title}
        </span>
        <div className="flex items-center gap-2">
          {isTranslation ? (
            <>
              <div className="flex items-center gap-1 rounded-lg bg-white p-0.5 ring-1 ring-[#c3c5d9]/20">
                <button
                  type="button"
                  onClick={() => setMode("preview")}
                  className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                    mode === "preview"
                      ? "bg-[#d5e3fc] text-[#003ec7]"
                      : "text-[#737688] hover:text-[#003ec7]"
                  }`}
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setMode("code")}
                  className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                    mode === "code"
                      ? "bg-[#d5e3fc] text-[#003ec7]"
                      : "text-[#737688] hover:text-[#003ec7]"
                  }`}
                >
                  Code
                </button>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!outputMarkdown}
                className="rounded-full px-2 py-1 text-xs font-bold text-[#737688] transition hover:bg-[#dee8ff] hover:text-[#003ec7] disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Copy translation"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!outputMarkdown}
                className="rounded-full px-2 py-1 text-xs font-bold text-[#737688] transition hover:bg-[#dee8ff] hover:text-[#003ec7] disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Download translation"
              >
                Save
              </button>
            </>
          ) : (
            <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#737688] ring-1 ring-[#c3c5d9]/20">
              README.MD
            </span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={mode === "preview" ? onScroll : undefined}
        className={`surface-pane custom-scrollbar flex min-h-0 flex-1 overflow-y-auto rounded-xl ${
          isTranslation ? "ring-1 ring-[#003ec7]/10" : "ring-1 ring-[#c3c5d9]/15"
        }`}
      >
        {mode === "code" ? (
          <pre className="custom-scrollbar min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-6 text-[#111c2d]">
            {outputMarkdown || <span className="text-[#b0b3c8]">{emptyState}</span>}
          </pre>
        ) : paragraphs.length === 0 ? (
          <div className="grid min-h-full flex-1 place-items-center px-8 py-16 text-center text-sm text-[#737688]">
            {emptyState}
          </div>
        ) : (
          <div className="grid min-w-0 flex-1 grid-cols-[3.25rem_minmax(0,1fr)]">
            <div className="line-number-gutter select-none py-4 text-center text-[10px] leading-8">
              {paragraphs.map((paragraph, index) => (
                <div key={paragraph.id}>{formatLineNumber(index)}</div>
              ))}
            </div>
            <div className="min-w-0 py-3">
              {paragraphs.map((paragraph) => (
                <ParagraphBlock key={paragraph.id} paragraph={paragraph} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
