"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

interface Props {
  left: ReactNode;
  right: ReactNode;
  defaultLeftPercent?: number;
  minPercent?: number;
  maxPercent?: number;
}

export default function ResizableSplitPane({
  left,
  right,
  defaultLeftPercent = 50,
  minPercent = 20,
  maxPercent = 80,
}: Props) {
  const [leftPercent, setLeftPercent] = useState(defaultLeftPercent);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleMouseDown = useCallback(() => {
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const nextPercent = ((event.clientX - rect.left) / rect.width) * 100;
      setLeftPercent(Math.min(maxPercent, Math.max(minPercent, nextPercent)));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [maxPercent, minPercent]);

  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-1 gap-0">
      <div className="min-h-0 flex-none overflow-hidden" style={{ width: `${leftPercent}%` }}>
        {left}
      </div>
      <div
        role="separator"
        aria-label="Resize panes"
        onMouseDown={handleMouseDown}
        className="group relative z-10 hidden w-3 flex-none cursor-col-resize lg:block"
      >
        <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-[var(--outline-variant)] transition group-hover:w-1 group-hover:bg-[var(--primary)]" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden lg:min-w-[20%]">{right}</div>
    </div>
  );
}
