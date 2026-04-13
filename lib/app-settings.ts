export type UiLanguage = "en" | "zh-CN";

export interface AppSettings {
  ui_language: UiLanguage;
  default_target_lang: string;
  auto_translate_enabled: boolean;
  auto_translate_debounce_ms: number;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ui_language: "en",
  default_target_lang: "zh-CN",
  auto_translate_enabled: true,
  auto_translate_debounce_ms: 1500,
};

export const TARGET_LANGUAGE_OPTIONS = [
  { value: "zh-CN", label: "Chinese (Simplified)" },
  { value: "zh-TW", label: "Chinese (Traditional)" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
];

export function normalizeUiLanguage(value: unknown): UiLanguage {
  return value === "zh-CN" ? "zh-CN" : "en";
}

export function normalizeTargetLanguage(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_APP_SETTINGS.default_target_lang;
  }

  const normalized = value.trim();
  return TARGET_LANGUAGE_OPTIONS.some((option) => option.value === normalized)
    ? normalized
    : DEFAULT_APP_SETTINGS.default_target_lang;
}

export function normalizeAutoTranslateEnabled(value: unknown): boolean {
  return value === false ? false : Boolean(value ?? true);
}

export function normalizeAutoTranslateDebounceMs(value: unknown): number {
  const nextValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : DEFAULT_APP_SETTINGS.auto_translate_debounce_ms;

  if (!Number.isFinite(nextValue)) {
    return DEFAULT_APP_SETTINGS.auto_translate_debounce_ms;
  }

  return Math.min(5000, Math.max(300, Math.round(nextValue)));
}

export function normalizeAppSettings(
  value: Partial<AppSettings> | null | undefined
): AppSettings {
  return {
    ui_language: normalizeUiLanguage(value?.ui_language),
    default_target_lang: normalizeTargetLanguage(value?.default_target_lang),
    auto_translate_enabled: normalizeAutoTranslateEnabled(
      value?.auto_translate_enabled
    ),
    auto_translate_debounce_ms: normalizeAutoTranslateDebounceMs(
      value?.auto_translate_debounce_ms
    ),
  };
}
