"use client";

import { useEffect, type RefObject } from "react";
import type { MermaidConfig } from "mermaid";

const panZoomCleanupMap = new WeakMap<HTMLElement, () => void>();

function getMermaidThemeConfig(themeMode: "light" | "dark"): MermaidConfig {
  const isDark = themeMode === "dark";
  return {
    startOnLoad: false,
    theme: themeMode === "dark" ? "dark" : "default",
    darkMode: isDark,
    themeVariables: isDark
      ? {
          primaryColor: "#2A2B2C",
          primaryBorderColor: "#48A0C7",
          primaryTextColor: "#F3F7FA",
          secondaryColor: "#243040",
          secondaryBorderColor: "#48A0C7",
          secondaryTextColor: "#F3F7FA",
          tertiaryColor: "#1E3A47",
          tertiaryBorderColor: "#48A0C7",
          tertiaryTextColor: "#F3F7FA",
          lineColor: "#D6D8DD",
          textColor: "#F3F7FA",
          mainBkg: "#2A2B2C",
          clusterBkg: "#202428",
          nodeBorder: "#48A0C7",
          edgeLabelBackground: "#1A1D20",
        }
      : undefined,
  };
}

function parseViewBox(svg: SVGSVGElement) {
  const rawViewBox = svg.getAttribute("viewBox")?.trim();
  if (rawViewBox) {
    const values = rawViewBox
      .split(/[\s,]+/)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (values.length === 4) {
      const [x, y, width, height] = values;
      if (width > 0 && height > 0) {
        return { x, y, width, height };
      }
    }
  }

  const width = Number(svg.getAttribute("width")) || svg.viewBox.baseVal.width || 1;
  const height = Number(svg.getAttribute("height")) || svg.viewBox.baseVal.height || 1;
  return { x: 0, y: 0, width, height };
}

function trimSvgToContentBounds(svg: SVGSVGElement) {
  const contentGroup =
    svg.querySelector<SVGGElement>("svg > g") ?? svg.querySelector<SVGGElement>("g");

  if (!contentGroup) {
    return;
  }

  try {
    const bbox = contentGroup.getBBox();
    if (bbox.width <= 0 || bbox.height <= 0) {
      return;
    }

    const padding = 24;
    svg.setAttribute(
      "viewBox",
      `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`
    );
  } catch {
    // Ignore environments where SVG bounding boxes are not measurable.
  }
}

function mountPanAndZoom(block: HTMLElement) {
  panZoomCleanupMap.get(block)?.();

  const svg = block.querySelector<SVGSVGElement>("svg");
  if (!svg) {
    return;
  }

  block.classList.add("is-interactive");
  svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
  trimSvgToContentBounds(svg);

  const initialViewBox = parseViewBox(svg);
  let scale = 1;
  let viewBox = { ...initialViewBox };
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let originViewBoxX = initialViewBox.x;
  let originViewBoxY = initialViewBox.y;

  const applyViewBox = () => {
    svg.setAttribute(
      "viewBox",
      `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`
    );
  };

  const clampScale = (nextScale: number) =>
    Math.min(4, Math.max(0.4, Number(nextScale.toFixed(3))));

  applyViewBox();

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    originViewBoxX = viewBox.x;
    originViewBoxY = viewBox.y;
    block.classList.add("is-dragging");
    block.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const unitsPerPixelX = viewBox.width / rect.width;
    const unitsPerPixelY = viewBox.height / rect.height;
    viewBox = {
      ...viewBox,
      x: originViewBoxX - (event.clientX - startX) * unitsPerPixelX,
      y: originViewBoxY - (event.clientY - startY) * unitsPerPixelY,
    };
    applyViewBox();
  };

  const releasePointer = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) {
      return;
    }

    pointerId = null;
    block.classList.remove("is-dragging");
    if (block.hasPointerCapture(event.pointerId)) {
      block.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();

    const nextScale = clampScale(scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1));
    if (nextScale === scale) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const pointerRatioX = (event.clientX - rect.left) / rect.width;
    const pointerRatioY = (event.clientY - rect.top) / rect.height;
    const anchorX = viewBox.x + pointerRatioX * viewBox.width;
    const anchorY = viewBox.y + pointerRatioY * viewBox.height;
    const nextWidth = initialViewBox.width / nextScale;
    const nextHeight = initialViewBox.height / nextScale;

    scale = nextScale;
    viewBox = {
      x: anchorX - pointerRatioX * nextWidth,
      y: anchorY - pointerRatioY * nextHeight,
      width: nextWidth,
      height: nextHeight,
    };
    applyViewBox();
  };

  block.addEventListener("pointerdown", handlePointerDown);
  block.addEventListener("pointermove", handlePointerMove);
  block.addEventListener("pointerup", releasePointer);
  block.addEventListener("pointercancel", releasePointer);
  block.addEventListener("wheel", handleWheel, { passive: false });

  const cleanup = () => {
    block.removeEventListener("pointerdown", handlePointerDown);
    block.removeEventListener("pointermove", handlePointerMove);
    block.removeEventListener("pointerup", releasePointer);
    block.removeEventListener("pointercancel", releasePointer);
    block.removeEventListener("wheel", handleWheel);
    block.classList.remove("is-dragging");
    panZoomCleanupMap.delete(block);
  };

  panZoomCleanupMap.set(block, cleanup);
}

export function useMermaidRenderer(
  containerRef: RefObject<HTMLElement | null>,
  contentKey: string,
  themeMode: "light" | "dark"
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

      mermaid.initialize(getMermaidThemeConfig(themeMode));

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
            mountPanAndZoom(block);
          }
        } catch {
          // Leave the code block visible if Mermaid rendering fails.
        }
      }
    });

    return () => {
      disposed = true;
      blocks.forEach((block) => {
        panZoomCleanupMap.get(block)?.();
      });
    };
  }, [containerRef, contentKey, themeMode]);
}
