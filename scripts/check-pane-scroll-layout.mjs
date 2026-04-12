import { readFileSync } from "node:fs";

const files = {
  layout: readFileSync("app/layout.tsx", "utf8"),
  page: readFileSync("app/page.tsx", "utf8"),
  splitView: readFileSync("components/SplitView.tsx", "utf8"),
  previewPane: readFileSync("components/PreviewPane.tsx", "utf8"),
  globals: readFileSync("app/globals.css", "utf8"),
};

function assertIncludes(name, content, expected) {
  if (!content.includes(expected)) {
    throw new Error(`${name} must include "${expected}"`);
  }
}

assertIncludes("app/layout.tsx body", files.layout, "h-full");
assertIncludes("app/layout.tsx body", files.layout, "overflow-hidden");
assertIncludes("app/page.tsx main", files.page, "h-screen");
assertIncludes("app/page.tsx main", files.page, "overflow-hidden");
assertIncludes("app/page.tsx content wrapper", files.page, "min-h-0");
assertIncludes("app/page.tsx content wrapper", files.page, "overflow-hidden");
assertIncludes("components/SplitView.tsx root", files.splitView, "h-full");
assertIncludes("components/SplitView.tsx root", files.splitView, "min-h-0");
assertIncludes("components/PreviewPane.tsx section", files.previewPane, "min-h-0");
assertIncludes("components/PreviewPane.tsx section", files.previewPane, "overflow-y-auto");
assertIncludes("app/globals.css html/body", files.globals, "height: 100%;");
assertIncludes("app/globals.css html/body", files.globals, "overflow: hidden;");

console.log("pane scroll layout contract passed");
