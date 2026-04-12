"use client";

import { type Paragraph } from "@/stores/translation";

interface Props {
  paragraph: Paragraph;
}

export default function ParagraphBlock({ paragraph }: Props) {
  const icon =
    paragraph.status === "translating"
      ? "..."
      : paragraph.status === "done"
        ? "OK"
        : paragraph.status === "error"
          ? "ERR"
          : paragraph.status === "edited"
            ? "EDIT"
            : null;

  const contentClass =
    paragraph.type === "code" || paragraph.type === "mermaid"
      ? "font-mono text-[13px]"
      : "text-sm";

  return (
    <article
      data-paragraph-id={paragraph.id}
      className={`group relative border-l-2 px-4 py-3 transition-colors ${
        paragraph.status === "error"
          ? "border-red-500 bg-red-50/70"
          : "border-transparent hover:bg-stone-100/80"
      }`}
    >
      <div className="pr-16 whitespace-pre-wrap break-words leading-6 text-stone-800">
        <div className={contentClass}>{paragraph.translated || paragraph.original}</div>
      </div>
      {icon ? (
        <div className="absolute top-3 right-4 rounded-full border border-stone-300 bg-white px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-stone-500">
          {icon}
        </div>
      ) : null}
      {paragraph.status === "error" && paragraph.errorMessage ? (
        <p className="mt-2 text-xs text-red-600">{paragraph.errorMessage}</p>
      ) : null}
    </article>
  );
}
