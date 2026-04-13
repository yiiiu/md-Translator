import MarkdownIt from "markdown-it";
import { codeToHtml } from "shiki/bundle/web";
import { readFileSync } from "node:fs";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
const html = md.render("# Title\n\nThis is **bold**.");
if (!html.includes("<h1>Title</h1>")) {
  throw new Error("Expected markdown-it to render heading tags");
}
if (!html.includes("<strong>bold</strong>")) {
  throw new Error("Expected markdown-it to render emphasis tags");
}

const highlighted = await codeToHtml("const value = 1;", {
  lang: "ts",
  theme: "github-light",
});
if (!highlighted.includes("shiki")) {
  throw new Error("Expected Shiki to produce highlighted code HTML");
}

const paragraphBlock = readFileSync("components/ParagraphBlock.tsx", "utf8");
if (!paragraphBlock.includes("renderMarkdown")) {
  throw new Error("Expected ParagraphBlock to use the Markdown renderer");
}
if (!paragraphBlock.includes("dangerouslySetInnerHTML")) {
  throw new Error("Expected ParagraphBlock to render Markdown HTML");
}

console.log("markdown rendering contract passed");
