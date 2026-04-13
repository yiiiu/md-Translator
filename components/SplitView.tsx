"use client";

import { useEffect, useRef, type DragEvent } from "react";
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

export default function SplitView() {
  const { paragraphs, rawInput, setRawInput, setParagraphs } = useTranslationStore();
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const { handleLeftScroll, handleRightScroll } = useScrollSync(leftRef, rightRef);

  const syncMarkdown = (markdown: string) => {
    setRawInput(markdown);
  };

  useEffect(() => {
    setParagraphs(rawInput.trim() ? mapToParagraphs(rawInput) : []);
  }, [rawInput, setParagraphs]);

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
          <span className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#434656]">
            Original
          </span>
          <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#737688] ring-1 ring-[#c3c5d9]/20">
            README.MD
          </span>
        </div>

        <div
          ref={leftRef}
          onScroll={handleLeftScroll}
          className="surface-pane custom-scrollbar flex min-h-0 flex-1 overflow-hidden rounded-xl ring-1 ring-[#c3c5d9]/15"
        >
          <textarea
            value={rawInput}
            onChange={(event) => syncMarkdown(event.target.value)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            placeholder="Paste Markdown here, or drag & drop a .md file..."
            className="custom-scrollbar h-full min-h-0 w-full flex-1 resize-none overflow-y-auto bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-[#111c2d] outline-none placeholder:text-[#b0b3c8]"
          />
        </div>
      </section>

      <PreviewPane
        paragraphs={paragraphs}
        title="Translation"
        containerRef={rightRef}
        onScroll={handleRightScroll}
        viewMode="preview"
      />
    </div>
  );
}
