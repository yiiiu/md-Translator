import type { ThemeMode } from "@/lib/app-settings";

export function applyThemeModeToDocument(themeMode: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme-mode", themeMode);
}

export function resolveThemeMode(
  themeMode: ThemeMode,
  prefersDark: boolean
): "light" | "dark" {
  if (themeMode === "dark") {
    return "dark";
  }

  if (themeMode === "light") {
    return "light";
  }

  return prefersDark ? "dark" : "light";
}
