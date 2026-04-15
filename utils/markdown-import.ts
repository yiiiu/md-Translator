import type { Paragraph } from "@/stores/translation";
import { parseMarkdown } from "@/utils/markdown-parser";

export function mapMarkdownToParagraphs(markdown: string): Paragraph[] {
  return parseMarkdown(markdown).map((paragraph) => ({
    id: paragraph.id,
    type: paragraph.type,
    original: paragraph.content,
    translated: "",
    status: "idle" as const,
  }));
}

export function isMarkdownFile(file: File) {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    name.endsWith(".txt") ||
    name.endsWith(".mmd") ||
    name.endsWith(".mermaid")
  );
}

export async function readMarkdownFile(file: File): Promise<string | null> {
  if (!isMarkdownFile(file)) {
    return null;
  }

  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const markdown =
        typeof loadEvent.target?.result === "string" ? loadEvent.target.result : "";
      resolve(markdown);
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read markdown file"));
    };
    reader.readAsText(file);
  });

  const name = file.name.toLowerCase();
  if (name.endsWith(".mmd") || name.endsWith(".mermaid")) {
    return `\`\`\`mermaid\n${raw.trim()}\n\`\`\``;
  }

  return raw;
}
