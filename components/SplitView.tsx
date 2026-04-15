"use client";

import { useCallback, useEffect, useRef, type DragEvent, type UIEvent } from "react";
import { startTranslation } from "@/services/api";
import { useAppSettingsStore } from "@/stores/app-settings";
import { useTranslationStore } from "@/stores/translation";
import { mapMarkdownToParagraphs, readMarkdownFile } from "@/utils/markdown-import";
import { useScrollSync } from "@/utils/scroll-sync";
import PreviewPane from "./PreviewPane";
import ResizableSplitPane from "./ResizableSplitPane";

function formatLineNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

export default function SplitView() {
  const {
    paragraphs,
    rawInput,
    mode,
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
  const lazyInFlightRef = useRef(false);
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
        if (current.abortController) return;
        if (current.paragraphs.some((paragraph) => paragraph.status !== "idle")) return;

        if (current.mode === "lazy") {
          return;
        }

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

      const nextParagraphs = mapMarkdownToParagraphs(markdown);
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

  useEffect(() => {
    if (mode !== "lazy" || !rightRef.current || paragraphs.length === 0) {
      return;
    }

    const root = rightRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (lazyInFlightRef.current) {
          return;
        }

        const currentState = useTranslationStore.getState();
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const paragraphId = (entry.target as HTMLElement).dataset.paragraphId;
          if (!paragraphId) {
            continue;
          }

          const anchorIndex = currentState.paragraphs.findIndex(
            (paragraph) => paragraph.id === paragraphId
          );

          if (anchorIndex < 0) {
            continue;
          }

          const batch = currentState.paragraphs
            .slice(anchorIndex, anchorIndex + 5)
            .filter((paragraph) => paragraph.status === "idle");

          if (batch.length === 0) {
            continue;
          }

          lazyInFlightRef.current = true;
          void startTranslation(
            batch,
            currentState.engine,
            currentState.targetLang,
            "lazy"
          ).finally(() => {
            lazyInFlightRef.current = false;
          });
          break;
        }
      },
      {
        root,
        rootMargin: "0px 0px 20% 0px",
        threshold: 0.1,
      }
    );

    root
      .querySelectorAll<HTMLElement>("[data-paragraph-id]")
      .forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [mode, paragraphs]);

  const handleTextareaScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (leftLineNumberRef.current) {
      leftLineNumberRef.current.scrollTop = event.currentTarget.scrollTop;
    }
    handleLeftScroll();
  };

  const handleDrop = async (event: DragEvent<HTMLTextAreaElement>) => {
    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    event.preventDefault();
    try {
      const markdown = await readMarkdownFile(file);
      if (typeof markdown === "string") {
        syncMarkdown(markdown);
      }
    } catch (error) {
      console.error("Failed to import dropped markdown:", error);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1">
      <ResizableSplitPane
        left={
          <section className="flex min-h-0 h-full flex-col gap-3 pr-2 lg:pr-4">
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
        }
        right={
          <div className="h-full min-h-0 pl-2 lg:pl-4">
            <PreviewPane
              paragraphs={paragraphs}
              title={labels.translation}
              emptyState={labels.empty}
              containerRef={rightRef}
              onScroll={handleRightScroll}
              viewMode="preview"
            />
          </div>
        }
      />
    </div>
  );
}
