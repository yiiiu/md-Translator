import { readFileSync } from "node:fs";

const packageJson = readFileSync("package.json", "utf8");
if (!packageJson.includes('"@radix-ui/react-select"')) {
  throw new Error("Project must depend on @radix-ui/react-select");
}

const uiSelect = readFileSync("components/ui/AppSelect.tsx", "utf8");
if (!uiSelect.includes('from "@radix-ui/react-select"')) {
  throw new Error("AppSelect must wrap Radix Select primitives");
}
if (!uiSelect.includes("Select.Root") || !uiSelect.includes("Select.Trigger")) {
  throw new Error("AppSelect must render Radix Root and Trigger");
}

const toolbar = readFileSync("components/Toolbar.tsx", "utf8");
if (toolbar.includes("<select")) {
  throw new Error("Toolbar must not render native select controls");
}
if (!toolbar.includes("AppSelect")) {
  throw new Error("Toolbar must use the shared AppSelect component");
}

console.log("radix select contract passed");
