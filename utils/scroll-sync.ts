import { useCallback, useRef, type RefObject } from "react";

export function useScrollSync(
  leftRef: RefObject<HTMLDivElement | null>,
  rightRef: RefObject<HTMLDivElement | null>
) {
  const isSyncing = useRef(false);

  const findVisibleParagraphId = (container: HTMLElement): string | null => {
    const containerRect = container.getBoundingClientRect();
    const paragraphs = container.querySelectorAll<HTMLElement>("[data-paragraph-id]");

    for (const paragraph of paragraphs) {
      const paragraphRect = paragraph.getBoundingClientRect();
      if (
        paragraphRect.top >= containerRect.top &&
        paragraphRect.top <= containerRect.top + 100
      ) {
        return paragraph.getAttribute("data-paragraph-id");
      }
    }

    let closestParagraph: HTMLElement | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const paragraph of paragraphs) {
      const paragraphRect = paragraph.getBoundingClientRect();
      const distance = Math.abs(paragraphRect.top - containerRect.top);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestParagraph = paragraph;
      }
    }

    return closestParagraph?.getAttribute("data-paragraph-id") || null;
  };

  const scrollToParagraph = (container: HTMLElement, paragraphId: string) => {
    const target = container.querySelector<HTMLElement>(
      `[data-paragraph-id="${paragraphId}"]`
    );
    if (target) {
      target.scrollIntoView({ block: "start", behavior: "auto" });
    }
  };

  const sync = useCallback(
    (sourceRef: RefObject<HTMLDivElement | null>, targetRef: RefObject<HTMLDivElement | null>) => {
      if (isSyncing.current || !sourceRef.current || !targetRef.current) {
        return;
      }

      isSyncing.current = true;

      const paragraphId = findVisibleParagraphId(sourceRef.current);
      if (paragraphId) {
        scrollToParagraph(targetRef.current, paragraphId);
      }

      requestAnimationFrame(() => {
        isSyncing.current = false;
      });
    },
    []
  );

  const handleLeftScroll = useCallback(() => {
    sync(leftRef, rightRef);
  }, [leftRef, rightRef, sync]);

  const handleRightScroll = useCallback(() => {
    sync(rightRef, leftRef);
  }, [leftRef, rightRef, sync]);

  return { handleLeftScroll, handleRightScroll };
}
