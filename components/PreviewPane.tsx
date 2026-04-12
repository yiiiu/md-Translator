"use client";

import type { RefObject, UIEventHandler } from "react";
import { type Paragraph } from "@/stores/translation";
import ParagraphBlock from "./ParagraphBlock";

interface Props {
  paragraphs: Paragraph[];
  title: string;
  containerRef?: RefObject<HTMLDivElement | null>;
  onScroll?: UIEventHandler<HTMLDivElement>;
  emptyState?: string;
}

export default function PreviewPane({
  paragraphs,
  title,
  containerRef,
  onScroll,
  emptyState = "在下方输入区粘贴 Markdown 或上传 .md 文件",
}: Props) {
  return (
    <section
      ref={containerRef}
      onScroll={onScroll}
      className="flex h-full flex-col overflow-y-auto rounded-2xl border border-stone-200 bg-white/90 shadow-[0_18px_50px_-32px_rgba(20,20,20,0.45)]"
    >
      <div className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
          {title}
        </p>
      </div>
      <div className="divide-y divide-stone-100">
        {paragraphs.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-stone-400">{emptyState}</div>
        ) : (
          paragraphs.map((paragraph) => (
            <ParagraphBlock key={paragraph.id} paragraph={paragraph} />
          ))
        )}
      </div>
    </section>
  );
}
