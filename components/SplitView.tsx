"use client";

import { useRef } from "react";
import { useTranslationStore } from "@/stores/translation";
import { useScrollSync } from "@/utils/scroll-sync";
import PreviewPane from "./PreviewPane";

export default function SplitView() {
  const { paragraphs } = useTranslationStore();
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const { handleLeftScroll, handleRightScroll } = useScrollSync(leftRef, rightRef);

  const originalParagraphs = paragraphs.map((paragraph) => ({
    ...paragraph,
    translated: "",
    status: "idle" as const,
    errorMessage: undefined,
  }));

  return (
    <div className="grid h-full min-h-0 flex-1 gap-5 lg:grid-cols-2 lg:gap-8">
      <PreviewPane
        paragraphs={originalParagraphs}
        title="Original"
        containerRef={leftRef}
        onScroll={handleLeftScroll}
      />
      <PreviewPane
        paragraphs={paragraphs}
        title="Translation"
        containerRef={rightRef}
        onScroll={handleRightScroll}
      />
    </div>
  );
}
