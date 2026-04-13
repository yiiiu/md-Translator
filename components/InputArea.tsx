"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslationStore } from "@/stores/translation";
import { parseMarkdown } from "@/utils/markdown-parser";

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

function isEditableTarget(
  target: EventTarget | null,
  importTextarea: HTMLTextAreaElement | null
) {
  if (!(target instanceof HTMLElement)) return false;
  if (target === importTextarea) return false;
  return Boolean(target.closest("input, textarea, [contenteditable='true']"));
}

export default function InputArea() {
  const { setParagraphs, reset } = useTranslationStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [draggingMarkdown, setDraggingMarkdown] = useState(false);

  const syncMarkdown = (markdown: string) => {
    if (!markdown.trim()) return;
    if (textareaRef.current) {
      textareaRef.current.value = markdown;
    }
    setParagraphs(mapToParagraphs(markdown));
  };

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

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target, textareaRef.current)) return;

      const markdown = event.clipboardData?.getData("text/plain") || "";
      if (!markdown.trim()) return;

      event.preventDefault();
      syncMarkdown(markdown);
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
      readMarkdownFile(file);
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
  });

  const handleParse = () => {
    syncMarkdown(textareaRef.current?.value || "");
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    readMarkdownFile(file);
  };

  const handleClear = () => {
    if (textareaRef.current) {
      textareaRef.current.value = "";
    }
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

      <footer className="bottom-action-shell grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(10rem,14rem)] lg:items-center lg:px-8">
        <textarea
          ref={textareaRef}
          placeholder="Paste Markdown here, or drag a .md file onto this bar."
          className="h-12 min-h-12 resize-none rounded-xl bg-white px-4 py-3 font-mono text-xs leading-5 text-[#111c2d] shadow-sm outline-none ring-1 ring-[#c3c5d9]/15 transition focus:ring-2 focus:ring-[#0052ff]/20"
        />

        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={handleParse}
            className="flex min-w-20 flex-col items-center rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#515f74] transition hover:bg-white"
          >
            <span className="text-sm">Parse</span>
          </button>
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

        <div className="hidden items-center justify-end gap-3 lg:flex">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#003ec7]">
            Active
          </span>
          <span className="text-[10px] font-bold text-[#737688]">
            Drop .md anywhere / Ctrl+V paste
          </span>
        </div>
      </footer>
    </>
  );
}
