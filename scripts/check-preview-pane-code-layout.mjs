import { readFileSync } from "node:fs";

const previewPane = readFileSync("components/PreviewPane.tsx", "utf8");

if (!previewPane.includes('<section className="flex h-full min-h-0 flex-col gap-3">')) {
  throw new Error("PreviewPane root section must fill the available column height");
}

if (
  !previewPane.includes(
    '<div className="grid h-full min-h-0 flex-1 grid-cols-[3.25rem_minmax(0,1fr)] overflow-hidden">'
  )
) {
  throw new Error("PreviewPane code mode grid must fill height and clip overflow");
}

if (
  !previewPane.includes(
    'className="custom-scrollbar h-full min-h-0 w-full flex-1 resize-none overflow-y-auto'
  )
) {
  throw new Error("PreviewPane code textarea must own full-height scrolling");
}

console.log("preview pane code layout contract passed");
