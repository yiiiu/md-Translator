import { readFileSync } from "node:fs";

const toolbar = readFileSync("components/Toolbar.tsx", "utf8");

for (const expected of [
  "function buildTransientEngineOption",
  "const displayEngineOptions",
  "options={displayEngineOptions}",
  "displayEngineOptions.find((option) => option.value === engine)",
]) {
  if (!toolbar.includes(expected)) {
    throw new Error(`components/Toolbar.tsx must include ${expected}`);
  }
}

if (toolbar.includes("?? DEFAULT_ENGINE_OPTIONS[0]")) {
  throw new Error(
    "components/Toolbar.tsx must not fall back to DEFAULT_ENGINE_OPTIONS[0] for the selected engine"
  );
}

console.log("toolbar engine hydration contract passed");
