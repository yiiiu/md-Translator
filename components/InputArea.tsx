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
  const { setParagraphs, reset } = useTranslationStore();
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
      const markdown = typeof loadEvent.target?.result === "string" ? loadEvent.target.result : "";
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
      const markdown = typeof loadEvent.target?.result === "string" ? loadEvent.target.result : "";
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
    <section className="border-t border-stone-200 bg-stone-50/90 px-4 py-4 backdrop-blur">
      <div
        className="grid gap-3 rounded-2xl border border-dashed border-stone-300 bg-white/90 p-3 lg:grid-cols-[1fr_auto]"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          placeholder="粘贴 Markdown，或拖拽 .md 文件到这里"
          className="min-h-28 w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 font-mono text-sm leading-6 text-stone-800 outline-none transition focus:border-blue-500 focus:bg-white"
        />
        <div className="flex flex-row gap-2 lg:flex-col">
          <button
            onClick={handleParse}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            Parse
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Upload .md
          </button>
          <button
            onClick={handleClear}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Clear
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
    </section>
  );
}
