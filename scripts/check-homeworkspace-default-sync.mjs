import { readFileSync } from "node:fs";

const translationStore = readFileSync("stores/translation.ts", "utf8");
for (const expected of [
  "const appSettingsState = useAppSettingsStore.getState();",
  "engine: appSettingsState.defaultEngine",
  "targetLang: appSettingsState.defaultTargetLang",
]) {
  if (!translationStore.includes(expected)) {
    throw new Error(`stores/translation.ts must include ${expected}`);
  }
}

const homeWorkspace = readFileSync("components/HomeWorkspace.tsx", "utf8");
for (const expected of [
  "const appSettingsState = useAppSettingsStore.getState();",
  "if (!appSettingsState.appSettingsHydrated)",
  "translationState.engine === appSettingsState.defaultEngine",
  "translationState.targetLang === appSettingsState.defaultTargetLang",
  "useAppSettingsStore.getState().applyAppSettings(initialSettings);",
]) {
  if (!homeWorkspace.includes(expected)) {
    throw new Error(`components/HomeWorkspace.tsx must include ${expected}`);
  }
}

console.log("home workspace default sync contract passed");
