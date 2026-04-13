import { existsSync, readFileSync } from "node:fs";

const appSettings = readFileSync("lib/app-settings.ts", "utf8");
for (const expected of ["export type ThemeMode", "theme_mode", "normalizeThemeMode"]) {
  if (!appSettings.includes(expected)) {
    throw new Error(`lib/app-settings.ts must include ${expected}`);
  }
}

const db = readFileSync("lib/db.ts", "utf8");
for (const expected of [
  "theme_mode TEXT NOT NULL DEFAULT 'system'",
  "ALTER TABLE app_settings ADD COLUMN theme_mode",
  "theme_mode = excluded.theme_mode",
]) {
  if (!db.includes(expected)) {
    throw new Error(`lib/db.ts must include ${expected}`);
  }
}

if (!existsSync("stores/app-settings.ts")) {
  throw new Error("stores/app-settings.ts must exist");
}

const appStore = readFileSync("stores/app-settings.ts", "utf8");
for (const expected of ["themeMode", "applyAppSettings", "setThemeMode"]) {
  if (!appStore.includes(expected)) {
    throw new Error(`stores/app-settings.ts must include ${expected}`);
  }
}

const themeHelpers = readFileSync("lib/theme.ts", "utf8");
for (const expected of ["data-theme-mode", "applyThemeModeToDocument", "resolveThemeMode"]) {
  if (!themeHelpers.includes(expected)) {
    throw new Error(`lib/theme.ts must include ${expected}`);
  }
}

const translationStore = readFileSync("stores/translation.ts", "utf8");
for (const forbidden of [
  "uiLanguage:",
  "appSettingsHydrated:",
  "defaultTargetLang:",
  "autoTranslateEnabled:",
  "autoTranslateDebounceMs:",
]) {
  if (translationStore.includes(forbidden)) {
    throw new Error(`stores/translation.ts must no longer include ${forbidden}`);
  }
}

const settingsApi = readFileSync("app/api/settings/route.ts", "utf8");
if (!settingsApi.includes("theme_mode")) {
  throw new Error("Settings API route must accept theme_mode");
}

const servicesApi = readFileSync("services/api.ts", "utf8");
if (!servicesApi.includes("theme_mode")) {
  throw new Error("services/api.ts must expose theme_mode in settings types");
}

const layout = readFileSync("app/layout.tsx", "utf8");
if (!layout.includes("data-theme-mode")) {
  throw new Error("app/layout.tsx must render data-theme-mode on <html>");
}

const settingsWorkspace = readFileSync("components/SettingsWorkspace.tsx", "utf8");
for (const expected of ["theme_mode", "themeSave", "apply immediately and auto-save", "AppSelect"]) {
  if (!settingsWorkspace.includes(expected)) {
    throw new Error(`SettingsWorkspace must include ${expected}`);
  }
}

const globals = readFileSync("app/globals.css", "utf8");
for (const expected of [
  'html[data-theme-mode="dark"]',
  'html[data-theme-mode="system"]',
  "color-scheme: dark",
  "--background:",
]) {
  if (!globals.includes(expected)) {
    throw new Error(`app/globals.css must include ${expected}`);
  }
}

for (const expected of [
  "--background-dark: #121314;",
  "--surface-dark: #191A1B;",
  "--surface-container-lowest-dark: #191A1B;",
  "--surface-container-low-dark: #202122;",
  "--surface-container-dark: #242526;",
  "--surface-container-high-dark: #2A2B2C;",
  "--surface-container-highest-dark: #333536;",
  "--on-surface-dark: #bfbfbf;",
  "--on-surface-variant-dark: #8C8C8C;",
  "--outline-variant-dark: #2A2B2C;",
]) {
  if (!globals.includes(expected)) {
    throw new Error(`app/globals.css must align dark tokens with VS Code 2026 Dark: ${expected}`);
  }
}

const homeWorkspace = readFileSync("components/HomeWorkspace.tsx", "utf8");
if (!homeWorkspace.includes("useAppSettingsStore.getState().applyAppSettings")) {
  throw new Error("HomeWorkspace must hydrate the app-settings store");
}

for (const path of ["app/settings/page.tsx", "app/history/page.tsx"]) {
  const source = readFileSync(path, "utf8");
  if (
    !source.includes("bg-[var(--background)]") &&
    !source.includes("bg-[var(--surface-container-low)]")
  ) {
    throw new Error(`${path} must use token-backed shell colors`);
  }
}

const appHeader = readFileSync("components/AppHeader.tsx", "utf8");
if (!appHeader.includes("useAppSettingsStore")) {
  throw new Error("AppHeader must read app settings from the dedicated store");
}

const splitView = readFileSync("components/SplitView.tsx", "utf8");
for (const expected of ["useAppSettingsStore", "autoTranslateEnabled", "autoTranslateDebounceMs"]) {
  if (!splitView.includes(expected)) {
    throw new Error(`SplitView must include ${expected} from app-settings store`);
  }
}

for (const path of [
  "components/ui/AppSelect.tsx",
  "components/ui/ConfirmDialog.tsx",
  "components/Toolbar.tsx",
  "components/StatusBar.tsx",
]) {
  const source = readFileSync(path, "utf8");
  if (!source.includes("var(--")) {
    throw new Error(`${path} must use semantic theme tokens`);
  }
}

const uiText = readFileSync("lib/ui-text.ts", "utf8");
for (const expected of ["themeMode", "themeModeDescription", "themeSaveFailed"]) {
  if (!uiText.includes(expected)) {
    throw new Error(`lib/ui-text.ts must include ${expected}`);
  }
}

const markdownRenderer = readFileSync("lib/markdown-renderer.ts", "utf8");
for (const expected of ["github-light", "github-dark", "themeMode"]) {
  if (!markdownRenderer.includes(expected)) {
    throw new Error(`lib/markdown-renderer.ts must include ${expected}`);
  }
}

const paragraphBlock = readFileSync("components/ParagraphBlock.tsx", "utf8");
if (!paragraphBlock.includes("renderMarkdown(content, resolvedTheme)")) {
  throw new Error("ParagraphBlock must pass the resolved theme to renderMarkdown");
}

for (const path of [
  "components/ProviderSettingsManager.tsx",
  "components/EngineConfig.tsx",
  "components/GlossaryManager.tsx",
  "app/history/page.tsx",
]) {
  const source = readFileSync(path, "utf8");
  for (const forbidden of [
    "bg-white",
    "bg-[#f9f9ff]",
    "text-[#111c2d]",
    "text-[#434656]",
    "ring-[#c3c5d9]",
    "bg-[#f0f3ff]",
    "bg-[#d5e3fc]",
    "text-[#57657a]",
    "text-[#737688]",
    "hover:bg-[#dee8ff]",
    "hover:bg-[#f5f7ff]",
  ]) {
    if (source.includes(forbidden)) {
      throw new Error(`${path} must remove hard-coded light theme token ${forbidden}`);
    }
  }
}

console.log("theme mode contract passed");
