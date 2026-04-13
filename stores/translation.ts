import { create } from "zustand";
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type UiLanguage,
} from "@/lib/app-settings";

export interface Paragraph {
  id: string;
  type:
    | "heading"
    | "paragraph"
    | "code"
    | "table"
    | "list"
    | "blockquote"
    | "mermaid";
  original: string;
  translated: string;
  status: "idle" | "translating" | "done" | "error" | "edited" | "queued";
  errorMessage?: string;
}

interface TranslationStore {
  rawInput: string;
  paragraphs: Paragraph[];
  engine: string;
  targetLang: string;
  mode: "full" | "lazy";
  taskId: string | null;
  connectionLost: boolean;
  uiLanguage: UiLanguage;
  appSettingsHydrated: boolean;
  defaultTargetLang: string;
  autoTranslateEnabled: boolean;
  autoTranslateDebounceMs: number;
  setRawInput: (text: string) => void;
  setParagraphs: (paragraphs: Paragraph[]) => void;
  updateParagraph: (id: string, update: Partial<Paragraph>) => void;
  setEngine: (engine: string) => void;
  setTargetLang: (lang: string) => void;
  setMode: (mode: "full" | "lazy") => void;
  setTaskId: (id: string | null) => void;
  setConnectionLost: (lost: boolean) => void;
  setAppSettings: (settings: Partial<AppSettings>) => void;
  applyAppSettings: (settings: AppSettings) => void;
  reset: () => void;
}

const initialState = {
  rawInput: "",
  paragraphs: [],
  engine: "openai",
  targetLang: "zh-CN",
  mode: "full" as const,
  taskId: null,
  connectionLost: false,
  uiLanguage: DEFAULT_APP_SETTINGS.ui_language,
  appSettingsHydrated: false,
  defaultTargetLang: DEFAULT_APP_SETTINGS.default_target_lang,
  autoTranslateEnabled: DEFAULT_APP_SETTINGS.auto_translate_enabled,
  autoTranslateDebounceMs: DEFAULT_APP_SETTINGS.auto_translate_debounce_ms,
};

export const useTranslationStore = create<TranslationStore>((set, get) => ({
  ...initialState,
  setRawInput: (rawInput) => set({ rawInput }),
  setParagraphs: (paragraphs) => set({ paragraphs }),
  updateParagraph: (id, update) =>
    set((state) => ({
      paragraphs: state.paragraphs.map((paragraph) =>
        paragraph.id === id ? { ...paragraph, ...update } : paragraph
      ),
    })),
  setEngine: (engine) => set({ engine }),
  setTargetLang: (targetLang) => set({ targetLang }),
  setMode: (mode) => set({ mode }),
  setTaskId: (taskId) => set({ taskId }),
  setConnectionLost: (connectionLost) => set({ connectionLost }),
  setAppSettings: (settings) =>
    set((state) => {
      const nextDefaultTargetLang =
        typeof settings.default_target_lang === "string"
          ? settings.default_target_lang
          : state.defaultTargetLang;
      const nextTargetLang =
        state.targetLang === state.defaultTargetLang
          ? nextDefaultTargetLang
          : state.targetLang;

      return {
        uiLanguage:
          settings.ui_language === "zh-CN" ? "zh-CN" : settings.ui_language === "en" ? "en" : state.uiLanguage,
        appSettingsHydrated: true,
        defaultTargetLang: nextDefaultTargetLang,
        targetLang: nextTargetLang,
        autoTranslateEnabled:
          typeof settings.auto_translate_enabled === "boolean"
            ? settings.auto_translate_enabled
            : state.autoTranslateEnabled,
        autoTranslateDebounceMs:
          typeof settings.auto_translate_debounce_ms === "number"
            ? settings.auto_translate_debounce_ms
            : state.autoTranslateDebounceMs,
      };
    }),
  applyAppSettings: (settings) =>
    set((state) => ({
      uiLanguage: settings.ui_language,
      appSettingsHydrated: true,
      defaultTargetLang: settings.default_target_lang,
      targetLang:
        state.rawInput || state.targetLang !== state.defaultTargetLang
          ? state.targetLang
          : settings.default_target_lang,
      autoTranslateEnabled: settings.auto_translate_enabled,
      autoTranslateDebounceMs: settings.auto_translate_debounce_ms,
    })),
  reset: () =>
    set(() => ({
      ...initialState,
      uiLanguage: get().uiLanguage,
      appSettingsHydrated: get().appSettingsHydrated,
      defaultTargetLang: get().defaultTargetLang,
      targetLang: get().defaultTargetLang,
      autoTranslateEnabled: get().autoTranslateEnabled,
      autoTranslateDebounceMs: get().autoTranslateDebounceMs,
    })),
}));
