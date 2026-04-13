"use client";

import { useRef, type ChangeEvent, type DragEvent } from "react";
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

export default function InputArea() {
  const { setParagraphs, reset, paragraphs } = useTranslationStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncMarkdown = (markdown: string) => {
    if (!markdown.trim()) return;
    setParagraphs(mapToParagraphs(markdown));
  };

  const handleParse = () => {
    syncMarkdown(textareaRef.current?.value || "");
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const markdown =
        typeof loadEvent.target?.result === "string" ? loadEvent.target.result : "";
      if (textareaRef.current) {
        textareaRef.current.value = markdown;
      }
      syncMarkdown(markdown);
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file || !file.name.endsWith(".md")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const markdown =
        typeof loadEvent.target?.result === "string" ? loadEvent.target.result : "";
      if (textareaRef.current) {
        textareaRef.current.value = markdown;
      }
      syncMarkdown(markdown);
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (textareaRef.current) {
      textareaRef.current.value = "";
    }
    reset();
  };

  return (
    <footer
      className="bottom-action-shell grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(12rem,18rem)] lg:items-center lg:px-8"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
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
        <div className="min-w-32">
          <p className="mb-1 text-right text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#434656]">
            {paragraphs.length} buffers
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#d8e3fb]">
            <div
              className="h-full rounded-full bg-[#003ec7]"
              style={{ width: paragraphs.length > 0 ? "36%" : "0%" }}
            />
          </div>
        </div>
        <div className="h-8 w-px bg-[#c3c5d9]/30" />
        <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#003ec7]">
          Active
        </span>
      </div>
    </footer>
  );
}

