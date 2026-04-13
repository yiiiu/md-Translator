"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
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
  const { paragraphs, reset, setRawInput } = useTranslationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    readMarkdownFile(file, setRawInput);
    event.target.value = "";
  };

  const handleClear = () => {
    reset();
  };

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

      <footer className="bottom-action-shell grid gap-3 px-4 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:px-8">
        <div className="flex justify-start gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-w-20 flex-col items-center rounded-xl bg-[#d5e3fc] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#003ec7] transition hover:bg-white"
          >
            <span className="text-sm">Upload</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex min-w-20 flex-col items-center rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#515f74] transition hover:bg-white"
          >
            <span className="text-sm">Clear</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div className="hidden text-center text-[10px] font-bold text-[#737688] lg:block">
          Drop .md anywhere / Ctrl+V paste
        </div>

        <div className="flex items-center justify-end gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#434656] ring-1 ring-[#c3c5d9]/20">
            {paragraphs.length} buffers
          </span>
          <span className="rounded-full bg-[#d5e3fc] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#003ec7]">
            Active
          </span>
        </div>
      </footer>
    </>
  );
}
