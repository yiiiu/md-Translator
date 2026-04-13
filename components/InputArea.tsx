"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslationStore } from "@/stores/translation";

function isMarkdownFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt");
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, [contenteditable='true']"));
}

function readMarkdownFile(file: File, onRead: (markdown: string) => void) {
  if (!isMarkdownFile(file)) return;

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const markdown =
      typeof loadEvent.target?.result === "string" ? loadEvent.target.result : "";
    onRead(markdown);
  };
  reader.readAsText(file);
}

export default function InputArea() {
  const { paragraphs, setRawInput } = useTranslationStore();
  const dragDepthRef = useRef(0);
  const [draggingMarkdown, setDraggingMarkdown] = useState(false);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const markdown = event.clipboardData?.getData("text/plain") || "";
      if (!markdown.trim()) return;

      event.preventDefault();
      setRawInput(markdown);
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

    const handleDrop = (event: DragEvent) => {
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;

      event.preventDefault();
      dragDepthRef.current = 0;
      setDraggingMarkdown(false);
      readMarkdownFile(file, setRawInput);
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
  }, [setRawInput]);

  return (
    <>
      {draggingMarkdown ? (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-[#111c2d]/18 p-6 backdrop-blur-sm">
          <div className="rounded-3xl bg-white/90 px-10 py-8 text-center shadow-[0_32px_64px_rgba(17,28,45,0.18)] ring-1 ring-[#0052ff]/20">
            <p className="font-headline text-2xl font-extrabold tracking-tight text-[#003ec7]">
              Drop Markdown to import
            </p>
            <p className="mt-2 text-sm font-medium text-[#434656]">
              Supports .md, .markdown, and .txt files.
            </p>
          </div>
        </div>
      ) : null}

      <footer className="bottom-action-shell flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#111c2d] text-xs font-bold text-white">
            L
          </div>
          <div className="truncate text-[10px] font-bold text-[#737688]">
            Drop .md anywhere · Ctrl+V paste
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#434656] ring-1 ring-[#c3c5d9]/20">
            {paragraphs.length} BUFFERS
          </span>
          <span className="rounded-full bg-[#d5e3fc] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#003ec7]">
            ACTIVE
          </span>
        </div>
      </footer>
    </>
  );
}
