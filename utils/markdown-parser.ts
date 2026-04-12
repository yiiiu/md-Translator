export interface ParsedParagraph {
  id: string;
  type: "heading" | "paragraph" | "code" | "table" | "list" | "blockquote" | "mermaid";
  content: string;
  index: number;
}

/**
 * Parse a Markdown string into a list of typed paragraphs.
 * Each paragraph gets a unique ID (p-0, p-1, ...).
 */
export function parseMarkdown(markdown: string): ParsedParagraph[] {
  const lines = markdown.split("\n");
  const paragraphs: ParsedParagraph[] = [];
  let currentBlock: string[] = [];
  let blockType: ParsedParagraph["type"] | null = null;
  let codeLang = "";
  let index = 0;

  const flush = () => {
    if (currentBlock.length === 0 && blockType === null) return;

    const content = currentBlock.join("\n").trim();
    if (!content && blockType === null) {
      currentBlock = [];
      blockType = null;
      return;
    }

    if (blockType === "code") {
      paragraphs.push({
        id: `p-${index}`,
        type: codeLang === "mermaid" ? "mermaid" : "code",
        content,
        index,
      });
      index++;
    } else if (blockType === "table") {
      paragraphs.push({
        id: `p-${index}`,
        type: "table",
        content,
        index,
      });
      index++;
    } else if (blockType === "list") {
      // Split list into individual items
      for (const line of currentBlock) {
        if (line.trim()) {
          paragraphs.push({
            id: `p-${index}`,
            type: "list",
            content: line,
            index,
          });
          index++;
        }
      }
    } else if (blockType === "blockquote") {
      paragraphs.push({
        id: `p-${index}`,
        type: "blockquote",
        content,
        index,
      });
      index++;
    } else if (blockType === "paragraph") {
      const trimmed = content.trim();
      if (trimmed) {
        paragraphs.push({
          id: `p-${index}`,
          type: "paragraph",
          content: trimmed,
          index,
        });
        index++;
      }
    } else {
      // heading
      const trimmed = content.trim();
      if (trimmed) {
        const type = trimmed.startsWith("#") ? "heading" : "paragraph";
        paragraphs.push({
          id: `p-${index}`,
          type,
          content: trimmed,
          index,
        });
        index++;
      }
    }

    currentBlock = [];
    blockType = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Inside code block
    if (blockType === "code") {
      currentBlock.push(line);
      if (line.trim().startsWith("```")) {
        flush();
      }
      continue;
    }

    // Start code block
    if (line.trim().startsWith("```")) {
      flush();
      blockType = "code";
      codeLang = line.trim().slice(3).trim();
      currentBlock = [line];
      continue;
    }

    // Table row
    if (line.trim().startsWith("|") && line.includes("|")) {
      if (blockType !== "table") {
        flush();
        blockType = "table";
      }
      currentBlock.push(line);
      continue;
    }

    // List item
    if (/^(\s*)([-*+]|\d+\.)\s/.test(line)) {
      if (blockType !== "list") {
        flush();
        blockType = "list";
      }
      currentBlock.push(line);
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      if (blockType !== "blockquote") {
        flush();
        blockType = "blockquote";
      }
      currentBlock.push(line);
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === "") {
      flush();
      continue;
    }

    // Heading
    if (line.startsWith("#")) {
      flush();
      paragraphs.push({
        id: `p-${index}`,
        type: "heading",
        content: line.trim(),
        index,
      });
      index++;
      continue;
    }

    // Regular text line — accumulate into paragraph
    if (blockType !== "paragraph") {
      flush();
      blockType = "paragraph";
    }
    currentBlock.push(line);
  }

  flush();
  return paragraphs;
}