import { readFileSync } from "node:fs";

const appSettings = readFileSync("lib/app-settings.ts", "utf8");
for (const expected of ["default_engine", 'default_engine: "openai"']) {
  if (!appSettings.includes(expected)) {
    throw new Error(`lib/app-settings.ts must include ${expected}`);
  }
}

const db = readFileSync("lib/db.ts", "utf8");
for (const expected of [
  "default_engine",
  "ensureAppSettingsColumns",
  "default_engine = excluded.default_engine",
]) {
  if (!db.includes(expected)) {
    throw new Error(`lib/db.ts must include ${expected}`);
  }
}

const appSettingsStore = readFileSync("stores/app-settings.ts", "utf8");
for (const expected of ["defaultEngine", "settings.default_engine"]) {
  if (!appSettingsStore.includes(expected)) {
    throw new Error(`stores/app-settings.ts must include ${expected}`);
  }
}

const homeWorkspace = readFileSync("components/HomeWorkspace.tsx", "utf8");
for (const expected of [
  "appSettingsHydrated",
  "applyAppSettings(initialSettings)",
  "setEngine(initialSettings.default_engine)",
]) {
  if (!homeWorkspace.includes(expected)) {
    throw new Error(`components/HomeWorkspace.tsx must include ${expected}`);
  }
}

const translationStore = readFileSync("stores/translation.ts", "utf8");
for (const expected of ["appSettingsState.defaultEngine", "appSettingsState.defaultTargetLang"]) {
  if (!translationStore.includes(expected)) {
    throw new Error(`stores/translation.ts must include ${expected}`);
  }
}

const toolbar = readFileSync("components/Toolbar.tsx", "utf8");
for (const expected of ["updateAppSettings", "default_engine: engine"]) {
  if (!toolbar.includes(expected)) {
    throw new Error(`components/Toolbar.tsx must include ${expected}`);
  }
}

const settingsApi = readFileSync("app/api/settings/route.ts", "utf8");
if (!settingsApi.includes("default_engine")) {
  throw new Error("app/api/settings/route.ts must persist default_engine");
}

console.log("default engine persistence contract passed");
