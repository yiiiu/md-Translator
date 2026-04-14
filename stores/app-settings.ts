import { create } from "zustand";
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type ThemeMode,
} from "@/lib/app-settings";
import { applyThemeModeToDocument } from "@/lib/theme";

interface AppSettingsState {
  appSettingsHydrated: boolean;
  uiLanguage: AppSettings["ui_language"];
  themeMode: ThemeMode;
  defaultEngine: string;
  defaultTargetLang: string;
  autoTranslateEnabled: boolean;
  autoTranslateDebounceMs: number;
  applyAppSettings: (settings: AppSettings) => void;
  setThemeMode: (themeMode: ThemeMode) => void;
}

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  appSettingsHydrated: false,
  uiLanguage: DEFAULT_APP_SETTINGS.ui_language,
  themeMode: DEFAULT_APP_SETTINGS.theme_mode,
  defaultEngine: DEFAULT_APP_SETTINGS.default_engine,
  defaultTargetLang: DEFAULT_APP_SETTINGS.default_target_lang,
  autoTranslateEnabled: DEFAULT_APP_SETTINGS.auto_translate_enabled,
  autoTranslateDebounceMs: DEFAULT_APP_SETTINGS.auto_translate_debounce_ms,
  applyAppSettings: (settings) =>
    set(() => {
      applyThemeModeToDocument(settings.theme_mode);

      return {
        appSettingsHydrated: true,
        uiLanguage: settings.ui_language,
        themeMode: settings.theme_mode,
        defaultEngine: settings.default_engine,
        defaultTargetLang: settings.default_target_lang,
        autoTranslateEnabled: settings.auto_translate_enabled,
        autoTranslateDebounceMs: settings.auto_translate_debounce_ms,
      };
    }),
  setThemeMode: (themeMode) =>
    set((state) => {
      applyThemeModeToDocument(themeMode);

      return {
        ...state,
        themeMode,
      };
    }),
}));
