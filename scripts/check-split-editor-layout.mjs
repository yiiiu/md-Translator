import { readFileSync } from "node:fs";

const store = readFileSync("stores/translation.ts", "utf8");
if (!store.includes("rawInput: string")) {
  throw new Error("translation store must expose rawInput");
}
if (!store.includes("setRawInput")) {
  throw new Error("translation store must expose setRawInput");
}
if (!store.includes("reset: () => set(initialState)")) {
  throw new Error("reset must clear rawInput through initialState");
}

const toolbar = readFileSync("components/Toolbar.tsx", "utf8");
if (!toolbar.includes('aria-label="Upload .md"') || !toolbar.includes('aria-label="Clear"')) {
  throw new Error("Toolbar must own accessible Upload .md and Clear actions");
}
if (!toolbar.includes("setRawInput(markdown)") || !toolbar.includes("reset()")) {
  throw new Error("Toolbar upload/clear must write rawInput and reset state");
}
if (!toolbar.includes("UploadIcon") || !toolbar.includes("ClearIcon")) {
  throw new Error("Toolbar Upload .md and Clear controls must be icon-only");
}
if (toolbar.includes(">Upload .md<") || toolbar.includes(">Clear<")) {
  throw new Error("Toolbar Upload .md and Clear controls must not render text labels");
}
if (!toolbar.includes("SettingsIcon") || toolbar.includes(">Settings<")) {
  throw new Error("Toolbar settings control must be icon-only");
}
if (!toolbar.includes("ProviderLogo") || toolbar.includes(">Engine<")) {
  throw new Error("Toolbar engine selector must show a provider logo instead of Engine text");
}
if (!toolbar.includes("engineSelectWidth")) {
  throw new Error("Toolbar engine selector must adapt to the selected provider label");
}
if (!toolbar.includes("bg-[#0052ff]") || !toolbar.includes("ring-[#003ec7]/20")) {
  throw new Error("Toolbar Upload .md and Clear buttons must be visually distinct");
}

const splitView = readFileSync("components/SplitView.tsx", "utf8");
if (!splitView.includes("<textarea")) {
  throw new Error("SplitView must render the left raw markdown textarea");
}
if (!splitView.includes('placeholder="Paste Markdown here, or drag & drop a .md file..."')) {
  throw new Error("SplitView textarea must use the requested placeholder");
}
if (!splitView.includes("line-number-gutter") || !splitView.includes("leading-5")) {
  throw new Error("SplitView must render a synchronized leading-5 line-number gutter");
}
if (!splitView.includes("syncMarkdown")) {
  throw new Error("SplitView must parse raw input through syncMarkdown");
}
if (!splitView.includes("startTranslation") || !splitView.includes("1500")) {
  throw new Error("SplitView must debounce automatic translation");
}
if (!splitView.includes("ref={leftRef}") || !splitView.includes("onScroll={handleLeftScroll}")) {
  throw new Error("SplitView left pane must keep the scroll-sync ref and onScroll");
}
if (!splitView.includes('viewMode="preview"')) {
  throw new Error("SplitView must pass preview mode to the translation pane");
}

const previewPane = readFileSync("components/PreviewPane.tsx", "utf8");
if (!previewPane.includes("viewMode")) {
  throw new Error("PreviewPane must accept a viewMode prop");
}
if (!previewPane.includes("Preview") || !previewPane.includes("Code")) {
  throw new Error("PreviewPane must render the Preview/Code toggle");
}
if (!previewPane.includes("<svg")) {
  throw new Error("PreviewPane toggle must use inline SVG icons");
}
if (!previewPane.includes('mode === "code"')) {
  throw new Error("PreviewPane must render raw code mode");
}
if (!previewPane.includes("<textarea")) {
  throw new Error("PreviewPane code mode must render an editable textarea");
}
if (!previewPane.includes("updateParagraph") || !previewPane.includes('status: "edited"')) {
  throw new Error("PreviewPane code edits must write edited paragraph translations");
}

const inputArea = readFileSync("components/InputArea.tsx", "utf8");
if (inputArea.includes("<textarea")) {
  throw new Error("InputArea must no longer render a textarea");
}
if (inputArea.includes("Parse")) {
  throw new Error("InputArea must no longer render a Parse button");
}
if (inputArea.includes("Upload") || inputArea.includes("Clear")) {
  throw new Error("InputArea must not render Upload or Clear actions");
}
if (!inputArea.includes("Drop .md anywhere")) {
  throw new Error("InputArea must keep the compact import hint");
}

console.log("split editor layout contract passed");
