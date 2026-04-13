"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject, UIEvent, UIEventHandler } from "react";
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

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4" />
    </svg>
  );
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
  const updateParagraph = useTranslationStore((state) => state.updateParagraph);
  const codeLineNumberRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState(viewMode);
  const outputMarkdown = paragraphs
    .map((paragraph) => paragraph.translated || paragraph.original)
    .join("\n\n");
  const [codeDraft, setCodeDraft] = useState(outputMarkdown);
  const codeLineCount = Math.max(1, codeDraft.split("\n").length);

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
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold tracking-[0.14em] transition ${
                    mode === "preview"
                      ? "bg-[#d5e3fc] text-[#003ec7]"
                      : "text-[#737688] hover:text-[#003ec7]"
                  }`}
                >
                  <EyeIcon />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setMode("code")}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold tracking-[0.14em] transition ${
                    mode === "code"
                      ? "bg-[#d5e3fc] text-[#003ec7]"
                      : "text-[#737688] hover:text-[#003ec7]"
                  }`}
                >
                  <CodeIcon />
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
            <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-[#737688] ring-1 ring-[#c3c5d9]/20">
              Readme.md
            </span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={mode === "preview" ? onScroll : undefined}
        className={`surface-pane custom-scrollbar flex min-h-0 flex-1 rounded-xl ${
          mode === "code" ? "overflow-hidden" : "overflow-y-auto"
        } ${isTranslation ? "ring-1 ring-[#003ec7]/10" : "ring-1 ring-[#c3c5d9]/15"}`}
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
              placeholder={emptyState}
              className="custom-scrollbar min-h-0 flex-1 resize-none overflow-y-auto bg-transparent px-4 py-3 font-mono text-xs leading-5 text-[#111c2d] outline-none placeholder:text-[#b0b3c8]"
            />
          </div>
        ) : paragraphs.length === 0 ? (
          <div className="grid min-h-full flex-1 place-items-center px-8 py-16 text-center text-sm text-[#737688]">
            {emptyState}
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
