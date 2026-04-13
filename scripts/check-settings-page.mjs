import { existsSync, readFileSync } from "node:fs";

const db = readFileSync("lib/db.ts", "utf8");
for (const expected of [
  "CREATE TABLE IF NOT EXISTS app_settings",
  "getAppSettings",
  "upsertAppSettings",
]) {
  if (!db.includes(expected)) {
    throw new Error(`lib/db.ts must include ${expected}`);
  }
}

const api = readFileSync("services/api.ts", "utf8");
for (const expected of ["fetchAppSettings", "updateAppSettings", "AppSettingsResponse"]) {
  if (!api.includes(expected)) {
    throw new Error(`services/api.ts must include ${expected}`);
  }
}

const settingsApiPath = "app/api/settings/route.ts";
if (!existsSync(settingsApiPath)) {
  throw new Error("Settings API route must exist");
}

const settingsApi = readFileSync(settingsApiPath, "utf8");
for (const expected of ["export async function GET", "export async function PATCH"]) {
  if (!settingsApi.includes(expected)) {
    throw new Error(`Settings API must include ${expected}`);
  }
}

const settingsPagePath = "app/settings/page.tsx";
if (!existsSync(settingsPagePath)) {
  throw new Error("Settings page must exist");
}

const settingsPage = readFileSync(settingsPagePath, "utf8");
for (const expected of ["<AppHeader", "SettingsWorkspace", "searchParams"]) {
  if (!settingsPage.includes(expected)) {
    throw new Error(`Settings page must include ${expected}`);
  }
}
if (!settingsPage.includes("overflow-hidden")) {
  throw new Error("Settings page must keep the outer content area non-scrolling");
}
if (settingsPage.includes("overflow-y-auto")) {
  throw new Error("Settings page must not make the whole page body scroll");
}

const settingsWorkspace = readFileSync("components/SettingsWorkspace.tsx", "utf8");
for (const expected of [
  "text.settings.general",
  "text.settings.providers",
  "text.settings.glossary",
  "ProviderSettingsManager",
  "GlossaryManager",
  'href="/history"',
  "AppSelect",
]) {
  if (!settingsWorkspace.includes(expected)) {
    throw new Error(`Settings workspace must include ${expected}`);
  }
}
if (settingsWorkspace.includes("<select")) {
  throw new Error("Settings workspace must not use native select elements");
}
for (const expected of ["sticky", "top-0", "overflow-y-auto", "min-h-0", "border-r"]) {
  if (!settingsWorkspace.includes(expected)) {
    throw new Error(`Settings workspace must include ${expected} for fixed sidebar layout`);
  }
}
for (const expected of [
  "sidebarCollapsed",
  "setSidebarCollapsed",
  "PanelLeftClose",
  "PanelLeftOpen",
  "justify-center",
  "280px minmax(0,1fr)",
  "88px minmax(0,1fr)",
  "h-12 w-12",
]) {
  if (!settingsWorkspace.includes(expected)) {
    throw new Error(`Settings workspace must include ${expected} for collapsible sidebar behavior`);
  }
}

const engineConfig = readFileSync("components/EngineConfig.tsx", "utf8");
if (!engineConfig.includes("providerName.trim() || providerText.customTitle")) {
  throw new Error("EngineConfig title must prefer the selected provider name");
}
if (engineConfig.includes("configured ? providerText.configured : providerText.notConfigured")) {
  throw new Error("EngineConfig must not repeat the configured status badge in the right panel");
}
for (const expected of ["AppSelect", "ConfirmDialog"]) {
  if (!engineConfig.includes(expected)) {
    throw new Error(`EngineConfig must include ${expected}`);
  }
}
if (engineConfig.includes("window.confirm")) {
  throw new Error("EngineConfig must not use window.confirm");
}

const glossaryManager = readFileSync("components/GlossaryManager.tsx", "utf8");
for (const expected of ["AppSelect", "ConfirmDialog"]) {
  if (!glossaryManager.includes(expected)) {
    throw new Error(`GlossaryManager must include ${expected}`);
  }
}
if (glossaryManager.includes("<select")) {
  throw new Error("GlossaryManager must not use native select elements");
}
if (glossaryManager.includes("window.confirm")) {
  throw new Error("GlossaryManager must not use window.confirm");
}

const appHeader = readFileSync("components/AppHeader.tsx", "utf8");
for (const expected of [
  'href: "/settings"',
  'pathname.startsWith("/settings")',
  "useTranslationStore",
  "appSettingsHydrated",
]) {
  if (!appHeader.includes(expected)) {
    throw new Error(`AppHeader must include ${expected}`);
  }
}

const toolbar = readFileSync("components/Toolbar.tsx", "utf8");
if (toolbar.includes("<EngineConfig")) {
  throw new Error("Toolbar must not render EngineConfig directly after Settings migration");
}

const homePage = readFileSync("app/page.tsx", "utf8");
for (const expected of ["HomeWorkspace", "getAppSettings"]) {
  if (!homePage.includes(expected)) {
    throw new Error(`Home page must include ${expected}`);
  }
}

const splitView = readFileSync("components/SplitView.tsx", "utf8");
for (const expected of ["autoTranslateEnabled", "autoTranslateDebounceMs"]) {
  if (!splitView.includes(expected)) {
    throw new Error(`SplitView must include ${expected}`);
  }
}
if (splitView.includes("1500")) {
  throw new Error("SplitView must not hardcode the auto-translate debounce");
}

const store = readFileSync("stores/translation.ts", "utf8");
for (const expected of ["applyAppSettings", "setAppSettings", "uiLanguage"]) {
  if (!store.includes(expected)) {
    throw new Error(`translation store must include ${expected}`);
  }
}

console.log("settings page contract passed");
