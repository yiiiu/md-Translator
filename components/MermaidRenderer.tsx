"use client";

import { useEffect, type RefObject } from "react";

export function useMermaidRenderer(
  containerRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const blocks = container.querySelectorAll<HTMLElement>(".mermaid-block");
    if (blocks.length === 0) {
      return;
    }

    let disposed = false;

    void import("mermaid").then(async ({ default: mermaid }) => {
      if (disposed) {
        return;
      }

      mermaid.initialize({ startOnLoad: false, theme: "default" });

      for (const block of blocks) {
        const code = decodeURIComponent(block.dataset.mermaid || "");
        if (!code) {
          continue;
        }

        try {
          const { svg } = await mermaid.render(
            `mermaid-${Math.random().toString(36).slice(2)}`,
            code
          );

          if (!disposed) {
            block.innerHTML = svg;
          }
        } catch {
          // Leave the code block visible if Mermaid rendering fails.
        }
      }
    });

    return () => {
      disposed = true;
    };
  }, [containerRef]);
}
