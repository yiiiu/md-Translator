"use client";

import { useCallback, useEffect, useRef, type DragEvent, type UIEvent } from "react";
import { startTranslation } from "@/services/api";
import { useAppSettingsStore } from "@/stores/app-settings";
import { useTranslationStore } from "@/stores/translation";
import { parseMarkdown } from "@/utils/markdown-parser";
import { useScrollSync } from "@/utils/scroll-sync";
import PreviewPane from "./PreviewPane";

function mapToParagraphs(markdown: string) {
  return parseMarkdown(markdown).map((paragraph) => ({
    id: paragraph.id,
    type: paragraph.type,
    original: paragraph.content,
    translated: "",
    status: "idle" as const,
  }));
}

function isMarkdownFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt");
}

function formatLineNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

export default function SplitView() {
  const {
    paragraphs,
    rawInput,
    setRawInput,
    setParagraphs,
    reset,
  } = useTranslationStore();
  const uiLanguage = useAppSettingsStore((state) => state.uiLanguage);
  const autoTranslateEnabled = useAppSettingsStore(
    (state) => state.autoTranslateEnabled
  );
  const autoTranslateDebounceMs = useAppSettingsStore(
    (state) => state.autoTranslateDebounceMs
  );
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftLineNumberRef = useRef<HTMLDivElement>(null);
  const autoTranslateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedRawRef = useRef(rawInput);
  const mountedRef = useRef(false);
  const { handleLeftScroll, handleRightScroll } = useScrollSync(leftRef, rightRef);
  const lineCount = Math.max(1, rawInput.split("\n").length);
  const labels =
    uiLanguage === "zh-CN"
      ? {
          original: "原文",
          translation: "译文",
          fileName: "Readme.md",
          placeholder: "在这里粘贴 Markdown，或拖拽一个 .md 文件...",
          empty: "在下方粘贴 Markdown，或上传一个 .md 文件开始。",
        }
      : {
          original: "Original",
          translation: "Translation",
          fileName: "Readme.md",
          placeholder: "Paste Markdown here, or drag & drop a .md file...",
          empty: "Paste Markdown below, or upload a .md file to start.",
        };

  const clearAutoTranslateTimer = useCallback(() => {
    if (autoTranslateTimerRef.current) {
      clearTimeout(autoTranslateTimerRef.current);
      autoTranslateTimerRef.current = null;
    }
  }, []);

  const scheduleAutoTranslate = useCallback(
    (markdown: string) => {
      clearAutoTranslateTimer();

      if (!autoTranslateEnabled) {
        return;
      }

      autoTranslateTimerRef.current = setTimeout(() => {
        const current = useTranslationStore.getState();
        if (current.rawInput !== markdown || current.paragraphs.length === 0) return;

        void startTranslation(
          current.paragraphs,
          current.engine,
          current.targetLang,
          current.mode
        ).catch(() => {
          // Manual Translate remains available if the background request fails.
        });
      }, autoTranslateDebounceMs);
    },
    [autoTranslateDebounceMs, autoTranslateEnabled, clearAutoTranslateTimer]
  );

  const syncMarkdown = useCallback(
    (markdown: string, options: { writeInput?: boolean } = {}) => {
      const writeInput = options.writeInput ?? true;
      lastSyncedRawRef.current = markdown;

      if (writeInput) {
        setRawInput(markdown);
      }

      if (!markdown.trim()) {
        clearAutoTranslateTimer();
        reset();
        return;
      }

      const nextParagraphs = mapToParagraphs(markdown);
      setParagraphs(nextParagraphs);
      scheduleAutoTranslate(markdown);
    },
    [clearAutoTranslateTimer, reset, scheduleAutoTranslate, setParagraphs, setRawInput]
  );

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      lastSyncedRawRef.current = rawInput;
      return;
    }

    if (rawInput !== lastSyncedRawRef.current) {
      syncMarkdown(rawInput, { writeInput: false });
    }
  }, [rawInput, syncMarkdown]);

  useEffect(() => {
    return () => clearAutoTranslateTimer();
  }, [clearAutoTranslateTimer]);

  const readMarkdownFile = (file: File) => {
    if (!isMarkdownFile(file)) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const markdown =
        typeof loadEvent.target?.result === "string" ? loadEvent.target.result : "";
      syncMarkdown(markdown);
    };
    reader.readAsText(file);
  };

  const handleTextareaScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (leftLineNumberRef.current) {
      leftLineNumberRef.current.scrollTop = event.currentTarget.scrollTop;
    }
    handleLeftScroll();
  };

  const handleDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    event.preventDefault();
    readMarkdownFile(file);
  };

  return (
    <div className="grid h-full min-h-0 flex-1 gap-5 lg:grid-cols-2 lg:gap-8">
      <section className="flex min-h-0 flex-col gap-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-extrabold tracking-[0.24em] text-[var(--on-surface-variant)]">
            {labels.original}
          </span>
          <span className="rounded-md bg-[var(--surface-container-lowest)] px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-[var(--on-surface-variant)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_24%,transparent)]">
            {labels.fileName}
          </span>
        </div>

        <div
          ref={leftRef}
          onScroll={handleLeftScroll}
          className="surface-pane custom-scrollbar grid min-h-0 flex-1 grid-cols-[3.25rem_minmax(0,1fr)] overflow-hidden rounded-xl ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]"
        >
          <div
            ref={leftLineNumberRef}
            aria-hidden="true"
            className="line-number-gutter overflow-hidden py-3 text-center text-[10px] leading-5"
          >
            {Array.from({ length: lineCount }, (_, index) => (
              <div key={index}>{formatLineNumber(index)}</div>
            ))}
          </div>
          <textarea
            value={rawInput}
            onChange={(event) => syncMarkdown(event.target.value)}
            onScroll={handleTextareaScroll}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            placeholder={labels.placeholder}
            className="custom-scrollbar h-full min-h-0 w-full flex-1 resize-none overflow-y-auto bg-transparent px-4 py-3 font-mono text-sm leading-5 text-[var(--on-surface)] outline-none placeholder:text-[color:color-mix(in_srgb,var(--on-surface-variant)_55%,white)]"
          />
        </div>
      </section>

      <PreviewPane
        paragraphs={paragraphs}
        title={labels.translation}
        emptyState={labels.empty}
        containerRef={rightRef}
        onScroll={handleRightScroll}
        viewMode="preview"
      />
    </div>
  );
}
