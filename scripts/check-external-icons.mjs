import { readFileSync } from "node:fs";

const packageJson = readFileSync("package.json", "utf8");
if (!packageJson.includes('"lucide-react"')) {
  throw new Error("Project must depend on lucide-react for interface icons");
}

const toolbar = readFileSync("components/Toolbar.tsx", "utf8");
if (!toolbar.includes('from "lucide-react"')) {
  throw new Error("Toolbar icons must come from lucide-react");
}
for (const localIcon of ["SettingsIcon", "HelpIcon", "UploadIcon", "ClearIcon"]) {
  if (toolbar.includes(`function ${localIcon}`)) {
    throw new Error(`Toolbar must not keep local inline SVG component ${localIcon}`);
  }
}

const previewPane = readFileSync("components/PreviewPane.tsx", "utf8");
if (!previewPane.includes('from "lucide-react"')) {
  throw new Error("PreviewPane icons must come from lucide-react");
}
for (const localIcon of ["EyeIcon", "CodeIcon"]) {
  if (previewPane.includes(`function ${localIcon}`)) {
    throw new Error(`PreviewPane must not keep local inline SVG component ${localIcon}`);
  }
}

const statusBar = readFileSync("components/StatusBar.tsx", "utf8");
if (!statusBar.includes('from "lucide-react"') || statusBar.includes("鈻?")) {
  throw new Error("StatusBar indicator must use lucide-react instead of a text glyph");
}

console.log("external icons contract passed");
