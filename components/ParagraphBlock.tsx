"use client";

import { useEffect, useState } from "react";
import { renderMarkdown } from "@/lib/markdown-renderer";
import { type Paragraph } from "@/stores/translation";

interface Props {
  paragraph: Paragraph;
}

export default function ParagraphBlock({ paragraph }: Props) {
  const content = paragraph.translated || paragraph.original;
  const [renderedContent, setRenderedContent] = useState("");

  useEffect(() => {
    let active = true;

    void renderMarkdown(content).then((html) => {
      if (active) {
        setRenderedContent(html);
      }
    });

    return () => {
      active = false;
    };
  }, [content]);

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

  return (
    <article
      data-paragraph-id={paragraph.id}
      className={`group relative border-l-2 px-4 py-3 transition-colors ${
        paragraph.status === "error"
          ? "border-red-500 bg-red-50/70"
          : "border-transparent hover:bg-stone-100/80"
      }`}
    >
      <div className="pr-16 break-words text-stone-800">
        <div
          className="markdown-rendered"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
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
