export interface ParsedParagraph {
  id: string;
  type: "heading" | "paragraph" | "code" | "table" | "list" | "blockquote" | "mermaid";
  content: string;
  index: number;
}

const FENCE_START_PATTERN = /^( {0,3})(`{3,}|~{3,})([^`~]*)$/;
const ATX_HEADING_PATTERN = /^ {0,3}#{1,6}(?:\s+|$)/;
const LIST_ITEM_PATTERN = /^(\s*)([-*+]|\d+\.)\s/;
const BLOCKQUOTE_PATTERN = /^ {0,3}>/;
const TABLE_DELIMITER_PATTERN = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;

/**
 * Parse a Markdown string into translation-sized blocks.
 * Each block gets a stable ID (p-0, p-1, ...).
 */
export function parseMarkdown(markdown: string): ParsedParagraph[] {
  const lines = normalizeMarkdown(markdown).split("\n");
  const paragraphs: ParsedParagraph[] = [];
  let currentBlock: string[] = [];
  let blockType: ParsedParagraph["type"] | null = null;
  let codeLang = "";
  let fenceMarker = "";
  let index = 0;

  const pushParagraph = (
    type: ParsedParagraph["type"],
    content: string,
    options?: { preserveLeadingWhitespace?: boolean }
  ) => {
    const normalizedContent = options?.preserveLeadingWhitespace
      ? content.trimEnd()
      : content.trim();
    if (!normalizedContent.trim()) return;

    paragraphs.push({
      id: `p-${index}`,
      type,
      content: normalizedContent,
      index,
    });
    index++;
  };

  const flush = () => {
    if (currentBlock.length === 0 && blockType === null) return;

    if (blockType === "code") {
      pushParagraph(codeLang === "mermaid" ? "mermaid" : "code", currentBlock.join("\n"));
    } else if (blockType === "table") {
      pushParagraph("table", currentBlock.join("\n"));
    } else if (blockType === "list") {
      flushListItems();
    } else if (blockType === "blockquote") {
      pushParagraph("blockquote", currentBlock.join("\n"), {
        preserveLeadingWhitespace: true,
      });
    } else if (blockType === "paragraph") {
      pushParagraph("paragraph", currentBlock.join("\n"));
    } else {
      const content = currentBlock.join("\n").trim();
      if (content) {
        pushParagraph(ATX_HEADING_PATTERN.test(content) ? "heading" : "paragraph", content);
      }
    }

    currentBlock = [];
    blockType = null;
    codeLang = "";
    fenceMarker = "";
  };

  const flushListItems = () => {
    let itemLines: string[] = [];

    const pushItem = () => {
      if (itemLines.length > 0) {
        pushParagraph("list", itemLines.join("\n"));
        itemLines = [];
      }
    };

    for (const line of currentBlock) {
      const match = line.match(LIST_ITEM_PATTERN);
      if (match && match[1].length === 0) {
        pushItem();
      }

      if (line.trim()) {
        itemLines.push(line);
      }
    }

    pushItem();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (blockType === "code") {
      currentBlock.push(line);
      if (isClosingFence(line, fenceMarker)) {
        flush();
      }
      continue;
    }

    const fenceStart = line.match(FENCE_START_PATTERN);
    if (fenceStart) {
      flush();
      blockType = "code";
      fenceMarker = fenceStart[2];
      codeLang = parseCodeLanguage(fenceStart[3]);
      currentBlock = [line];
      continue;
    }

    if (startsTable(lines, i)) {
      flush();
      blockType = "table";
      currentBlock = [line];
      continue;
    }

    if (blockType === "table") {
      if (line.includes("|")) {
        currentBlock.push(line);
        continue;
      }
      flush();
    }

    const listMatch = line.match(LIST_ITEM_PATTERN);
    if (listMatch) {
      if (blockType !== "list") {
        flush();
        blockType = "list";
      }
      currentBlock.push(line);
      continue;
    }

    if (blockType === "list") {
      if (line.trim() === "") {
        flush();
        continue;
      }
      if (/^\s+\S/.test(line)) {
        currentBlock.push(line);
        continue;
      }
      flush();
    }

    if (BLOCKQUOTE_PATTERN.test(line)) {
      if (blockType !== "blockquote") {
        flush();
        blockType = "blockquote";
      }
      currentBlock.push(line);
      continue;
    }

    if (blockType === "blockquote") {
      if (line.trim() === "") {
        flush();
        continue;
      }
      currentBlock.push(line);
      continue;
    }

    if (line.trim() === "") {
      flush();
      continue;
    }

    if (ATX_HEADING_PATTERN.test(line)) {
      flush();
      pushParagraph("heading", line);
      continue;
    }

    if (blockType !== "paragraph") {
      flush();
      blockType = "paragraph";
    }
    currentBlock.push(line);
  }

  flush();
  return paragraphs;
}

function normalizeMarkdown(markdown: string) {
  return markdown.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

function parseCodeLanguage(info: string) {
  return info.trim().split(/\s+/)[0]?.toLowerCase() || "";
}

function isClosingFence(line: string, openingFence: string) {
  if (!openingFence) return false;

  const fenceChar = openingFence[0];
  const escapedFenceChar = fenceChar === "`" ? "`" : "~";
  const pattern = new RegExp(`^ {0,3}${escapedFenceChar}{${openingFence.length},}\\s*$`);
  return pattern.test(line);
}

function startsTable(lines: string[], index: number) {
  const line = lines[index];
  const nextLine = lines[index + 1];

  if (!line.includes("|")) return false;
  if (typeof nextLine === "string" && TABLE_DELIMITER_PATTERN.test(nextLine)) {
    return true;
  }

  return line.trim().startsWith("|") && line.includes("|");
}
