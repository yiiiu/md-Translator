"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getUiText } from "@/lib/ui-text";
import { useAppSettingsStore } from "@/stores/app-settings";
import { useTranslationStore } from "@/stores/translation";
import { mapMarkdownToParagraphs, readMarkdownFile } from "@/utils/markdown-import";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, [contenteditable='true']"));
}

export default function InputArea() {
  const { paragraphs, reset, setParagraphs, setRawInput } = useTranslationStore();
  const uiLanguage = useAppSettingsStore((state) => state.uiLanguage);
  const text = getUiText(uiLanguage).input;
  const dragDepthRef = useRef(0);
  const [draggingMarkdown, setDraggingMarkdown] = useState(false);

  const importMarkdown = useCallback(
    (markdown: string) => {
      setRawInput(markdown);

      if (!markdown.trim()) {
        reset();
        return;
      }

      setParagraphs(mapMarkdownToParagraphs(markdown));
    },
    [reset, setParagraphs, setRawInput]
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const markdown = event.clipboardData?.getData("text/plain") || "";
      if (!markdown.trim()) return;

      event.preventDefault();
      importMarkdown(markdown);
    };

    const handleDragEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setDraggingMarkdown(true);
    };

    const handleDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
    };

    const handleDragLeave = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setDraggingMarkdown(false);
      }
    };

    const handleDrop = async (event: DragEvent) => {
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;

      event.preventDefault();
      dragDepthRef.current = 0;
      setDraggingMarkdown(false);

      try {
        const markdown = await readMarkdownFile(file);
        if (typeof markdown === "string") {
          importMarkdown(markdown);
        }
      } catch (error) {
        console.error("Failed to import dropped markdown:", error);
      }
    };

    window.addEventListener("paste", handlePaste);
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [importMarkdown]);

  return (
    <>
      {draggingMarkdown ? (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-[color:color-mix(in_srgb,var(--on-surface)_18%,transparent)] p-6 backdrop-blur-sm">
          <div className="rounded-3xl bg-[color:color-mix(in_srgb,var(--surface-container-lowest)_90%,transparent)] px-10 py-8 text-center shadow-[0_32px_64px_rgba(17,28,45,0.18)] ring-1 ring-[color:color-mix(in_srgb,var(--primary)_24%,transparent)]">
            <p className="font-headline text-2xl font-extrabold tracking-tight text-[var(--primary)]">
              {text.dropTitle}
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--on-surface-variant)]">
              {text.dropDescription}
            </p>
          </div>
        </div>
      ) : null}

      <footer className="bottom-action-shell flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--on-surface)] text-xs font-bold text-[var(--surface-container-lowest)]">
            L
          </div>
          <div className="truncate text-[10px] font-bold text-[var(--on-surface-variant)]">
            {text.hint}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <span className="rounded-full bg-[var(--surface-container-lowest)] px-3 py-1 text-[10px] font-extrabold tracking-[0.14em] text-[var(--on-surface-variant)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_24%,transparent)]">
            {paragraphs.length} {text.buffers}
          </span>
          <span className="rounded-full bg-[var(--secondary-container)] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[var(--primary)]">
            {text.active}
          </span>
        </div>
      </footer>
    </>
  );
}
