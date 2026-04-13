"use client";

import Link from "next/link";
import {
  AlertCircle,
  BookMarked,
  History,
  Languages,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { AppSettings, ThemeMode, UiLanguage } from "@/lib/app-settings";
import { getTargetLanguageOptions, getUiText } from "@/lib/ui-text";
import { useAppSettingsStore } from "@/stores/app-settings";
import {
  updateAppSettings,
  type GlossaryTermResponse,
} from "@/services/api";
import { useTranslationStore } from "@/stores/translation";
import GlossaryManager from "./GlossaryManager";
import ProviderSettingsManager from "./ProviderSettingsManager";
import AppSelect, { type AppSelectOption } from "./ui/AppSelect";

type SettingsTab = "general" | "providers" | "glossary";

const UI_LANGUAGE_OPTIONS: AppSelectOption[] = [
  { value: "en", label: "English" },
  { value: "zh-CN", label: "中文" },
];

function normalizeThemeMode(value: string): ThemeMode {
  return value === "light" || value === "dark" ? value : "system";
}

function isSettingsTab(value: string | undefined): value is SettingsTab {
  return value === "general" || value === "providers" || value === "glossary";
}

export default function SettingsWorkspace({
  initialTab,
  initialSettings,
  initialTerms,
  initialSourceLanguages,
  initialTargetLanguages,
}: {
  initialTab?: string;
  initialSettings: AppSettings;
  initialTerms: GlossaryTermResponse[];
  initialSourceLanguages: string[];
  initialTargetLanguages: string[];
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    isSettingsTab(initialTab) ? initialTab : "general"
  );
  const initializedRef = useRef(false);
  const [settingsForm, setSettingsForm] = useState<AppSettings>(initialSettings);
  const [savedSettings, setSavedSettings] = useState<AppSettings>(initialSettings);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalMessage, setGeneralMessage] = useState<string | null>(null);
  const [generalStatus, setGeneralStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeMessage, setThemeMessage] = useState<string | null>(null);
  const [themeStatus, setThemeStatus] = useState<"idle" | "success" | "error">("idle");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const setThemeMode = useAppSettingsStore((state) => state.setThemeMode);

  if (!initializedRef.current) {
    useAppSettingsStore.getState().applyAppSettings(initialSettings);
    initializedRef.current = true;
  }

  const uiLanguage: UiLanguage = settingsForm.ui_language;
  const text = getUiText(uiLanguage);
  const settingsText = text.settings as typeof text.settings & {
    themeMode: string;
    themeModeDescription: string;
    themeSystem: string;
    themeLight: string;
    themeDark: string;
    themeSaved: string;
    themeSaveFailed: string;
  };
  const themeModeOptions: AppSelectOption[] = [
    { value: "system", label: settingsText.themeSystem },
    { value: "light", label: settingsText.themeLight },
    { value: "dark", label: settingsText.themeDark },
  ];
  const targetLanguageSelectOptions: AppSelectOption[] = getTargetLanguageOptions(
    uiLanguage
  ).map((option) => ({
    value: option.value,
    label: option.label,
  }));
  const hasGeneralChanges =
    JSON.stringify(settingsForm) !== JSON.stringify(savedSettings);
  const interfaceLanguageDirty =
    settingsForm.ui_language !== savedSettings.ui_language;
  const pendingLanguageHint =
    uiLanguage === "zh-CN"
      ? "顶部导航会在保存设置后切换到新的界面语言。"
      : "Top navigation will switch to the new interface language after you save settings.";

  const tabs = useMemo(
    () => [
      {
        id: "general" as const,
        label: text.settings.general,
        icon: Languages,
      },
      {
        id: "providers" as const,
        label: text.settings.providers,
        icon: Sparkles,
      },
      {
        id: "glossary" as const,
        label: text.settings.glossary,
        icon: BookMarked,
      },
    ],
    [text.settings.general, text.settings.glossary, text.settings.providers]
  );

  const activeTabMeta = tabs.find((tab) => tab.id === activeTab);

  const getHeaderDescription = () => {
    if (activeTab === "providers") {
      return text.settings.providersDescription;
    }

    if (activeTab === "glossary") {
      return text.settings.glossaryDescription;
    }

    return text.settings.description;
  };

  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    setGeneralStatus("idle");
    setGeneralMessage(null);

    try {
      const nextSettings = await updateAppSettings(settingsForm);
      if (nextSettings.error) {
        setGeneralStatus("error");
        setGeneralMessage(nextSettings.error || text.settings.generalSaveFailed);
        return;
      }

      const previousDefaultTargetLang =
        useAppSettingsStore.getState().defaultTargetLang;
      const translationState = useTranslationStore.getState();
      setSavedSettings(nextSettings);
      setSettingsForm(nextSettings);
      useAppSettingsStore.getState().applyAppSettings(nextSettings);
      if (
        !translationState.rawInput &&
        translationState.targetLang === previousDefaultTargetLang
      ) {
        translationState.setTargetLang(nextSettings.default_target_lang);
      }
      setGeneralStatus("success");
      setGeneralMessage(text.settings.generalSaved);
    } catch (error) {
      setGeneralStatus("error");
      setGeneralMessage(
        error instanceof Error ? error.message : text.settings.generalSaveFailed
      );
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleThemeModeChange = async (value: string) => {
    const nextThemeMode = normalizeThemeMode(value);
    const previousThemeMode = savedSettings.theme_mode;

    if (
      nextThemeMode === previousThemeMode &&
      nextThemeMode === settingsForm.theme_mode
    ) {
      return;
    }

    // Theme changes apply immediately and auto-save.
    setThemeMode(nextThemeMode);
    setSettingsForm((current) => ({
      ...current,
      theme_mode: nextThemeMode,
    }));
    setSavingTheme(true);
    setThemeStatus("idle");
    setThemeMessage(null);

    try {
      const nextSettings = await updateAppSettings({ theme_mode: nextThemeMode });
      if (nextSettings.error) {
        throw new Error(nextSettings.error || settingsText.themeSaveFailed);
      }

      useAppSettingsStore.getState().applyAppSettings(nextSettings);
      setSavedSettings((current) => ({
        ...current,
        theme_mode: nextSettings.theme_mode,
      }));
      setSettingsForm((current) => ({
        ...current,
        theme_mode: nextSettings.theme_mode,
      }));
      setThemeStatus("success");
      setThemeMessage(settingsText.themeSaved);
    } catch (error) {
      setThemeMode(previousThemeMode);
      setSettingsForm((current) => ({
        ...current,
        theme_mode: previousThemeMode,
      }));
      setThemeStatus("error");
      setThemeMessage(
        error instanceof Error ? error.message : settingsText.themeSaveFailed
      );
    } finally {
      setSavingTheme(false);
    }
  };

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] bg-[var(--surface-container-lowest)] p-6 shadow-[0_24px_48px_rgba(17,28,45,0.06)]">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-2xl bg-[var(--secondary-container)] p-3 text-[var(--primary)]">
            <Languages className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="font-headline text-2xl font-extrabold tracking-tight text-[var(--on-surface)]">
              {text.settings.appearanceTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--on-surface-variant)]">
              {text.settings.appearanceDescription}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[var(--on-surface-variant)]">
              {settingsText.themeMode}
            </span>
            <AppSelect
              value={settingsForm.theme_mode}
              onValueChange={(value) => void handleThemeModeChange(value)}
              options={themeModeOptions}
              ariaLabel={settingsText.themeMode}
              triggerClassName="w-full justify-between bg-[var(--surface)] px-3 py-3 text-sm shadow-none ring-[color:color-mix(in_srgb,var(--outline-variant)_24%,transparent)] hover:bg-[var(--surface-container-low)]"
            />
            <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
              {settingsText.themeModeDescription}
            </p>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[var(--on-surface-variant)]">
              {text.settings.interfaceLanguage}
            </span>
            <AppSelect
              value={settingsForm.ui_language}
              onValueChange={(value) =>
                setSettingsForm((current) => ({
                  ...current,
                  ui_language: value === "zh-CN" ? "zh-CN" : "en",
                }))
              }
              options={UI_LANGUAGE_OPTIONS}
              ariaLabel={text.settings.interfaceLanguage}
              triggerClassName="w-full justify-between bg-[var(--surface)] px-3 py-3 text-sm shadow-none ring-[color:color-mix(in_srgb,var(--outline-variant)_24%,transparent)] hover:bg-[var(--surface-container-low)]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[var(--on-surface-variant)]">
              {text.settings.defaultTargetLanguage}
            </span>
            <AppSelect
              value={settingsForm.default_target_lang}
              onValueChange={(value) =>
                setSettingsForm((current) => ({
                  ...current,
                  default_target_lang: value,
                }))
              }
              options={targetLanguageSelectOptions}
              ariaLabel={text.settings.defaultTargetLanguage}
              triggerClassName="w-full justify-between bg-[var(--surface)] px-3 py-3 text-sm shadow-none ring-[color:color-mix(in_srgb,var(--outline-variant)_24%,transparent)] hover:bg-[var(--surface-container-low)]"
            />
          </label>
        </div>

        {themeMessage ? (
          <p
            className={`mt-4 rounded-xl px-3 py-2 text-sm ${
              themeStatus === "success"
                ? "bg-[var(--secondary-container)] text-[var(--primary)]"
                : "bg-[var(--error-container)] text-[var(--error)]"
            }`}
          >
            {savingTheme ? `${text.provider.saving}...` : themeMessage}
          </p>
        ) : null}

        {interfaceLanguageDirty ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-[color:color-mix(in_srgb,var(--secondary-container)_80%,#fff4dd)] px-3 py-2.5 text-sm text-[var(--on-surface-variant)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_28%,transparent)]">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]"
              strokeWidth={1.9}
            />
            <p>{pendingLanguageHint}</p>
          </div>
        ) : null}

        <div className="mt-6 space-y-5 rounded-[1.25rem] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-[var(--on-surface)]">{text.settings.autoTranslate}</p>
              <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                {text.settings.autoTranslateDescription}
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settingsForm.auto_translate_enabled}
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    auto_translate_enabled: event.target.checked,
                  }))
                }
                className="peer sr-only"
              />
              <span className="h-7 w-12 rounded-full bg-[var(--surface-container-highest)] transition peer-checked:bg-[var(--primary)]" />
              <span className="absolute left-1 h-5 w-5 rounded-full bg-[var(--surface-container-lowest)] transition peer-checked:translate-x-5" />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[var(--on-surface-variant)]">
              {text.settings.debounce}
            </span>
            <p className="mb-3 text-sm text-[var(--on-surface-variant)]">
              {text.settings.debounceDescription}
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="300"
                max="5000"
                step="100"
                value={settingsForm.auto_translate_debounce_ms}
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    auto_translate_debounce_ms: Number(event.target.value),
                  }))
                }
                className="w-full accent-[var(--primary)]"
              />
              <span className="min-w-20 rounded-xl bg-[var(--surface-container-lowest)] px-3 py-2 text-center text-sm font-bold text-[var(--primary)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_24%,transparent)]">
                {settingsForm.auto_translate_debounce_ms} {text.settings.milliseconds}
              </span>
            </div>
          </label>
        </div>

        {generalMessage ? (
          <p
            className={`mt-5 rounded-xl px-3 py-2 text-sm ${
              generalStatus === "success"
                ? "bg-[var(--secondary-container)] text-[var(--primary)]"
                : "bg-[var(--error-container)] text-[var(--error)]"
            }`}
          >
            {generalMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setSettingsForm(savedSettings);
              setGeneralMessage(null);
              setGeneralStatus("idle");
            }}
            disabled={!hasGeneralChanges || savingGeneral}
            className="rounded-xl bg-[var(--surface-container-lowest)] px-4 py-2 text-sm font-bold text-[var(--on-surface-variant)] shadow-sm transition hover:bg-[var(--surface-container-high)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {text.settings.discardGeneral}
          </button>
          <button
            type="button"
            onClick={() => void handleSaveGeneral()}
            disabled={!hasGeneralChanges || savingGeneral}
            className="rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] px-4 py-2 text-sm font-bold text-[var(--surface-container-lowest)] shadow-[0_14px_28px_rgba(0,82,255,0.22)] transition hover:shadow-[0_18px_36px_rgba(0,82,255,0.32)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {savingGeneral ? text.provider.saving : text.settings.saveGeneral}
          </button>
        </div>
      </section>

      <section className="rounded-[1.5rem] bg-[var(--secondary-container)] p-6 text-[var(--on-surface)] shadow-[0_24px_48px_rgba(17,28,45,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-headline text-xl font-extrabold tracking-tight">
              {text.history.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-[var(--on-surface-variant)]">
              {text.settings.historyDescription}
            </p>
          </div>
          <Link
            href="/history"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--surface-container-lowest)] px-4 py-2 text-sm font-bold text-[var(--primary)] shadow-sm transition hover:bg-[var(--surface)]"
          >
            <History className="h-4 w-4" strokeWidth={1.8} />
            {text.settings.historyLink}
          </Link>
        </div>
      </section>
    </div>
  );

  const renderProvidersTab = () => <ProviderSettingsManager uiLanguage={uiLanguage} />;

  const renderGlossaryTab = () => (
    <GlossaryManager
      initialTerms={initialTerms}
      initialSourceLanguages={initialSourceLanguages}
      initialTargetLanguages={initialTargetLanguages}
      embedded
      showHeader={false}
      uiLanguage={uiLanguage}
    />
  );

  return (
    <div
      className="grid h-full min-h-0 transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        gridTemplateColumns: sidebarCollapsed
          ? "88px minmax(0,1fr)"
          : "280px minmax(0,1fr)",
      }}
    >
      <aside className="min-h-0 bg-[var(--surface-container)] xl:sticky xl:top-0">
        <div className="flex h-full min-h-0 flex-col border-r border-[color:color-mix(in_srgb,var(--outline-variant)_24%,transparent)] transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
          <div
            className={`overflow-hidden border-b border-[color:color-mix(in_srgb,var(--outline-variant)_24%,transparent)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              sidebarCollapsed
                ? "flex h-16 items-center justify-center px-2 py-2"
                : "px-6 py-6"
            }`}
          >
            <div
              className={`flex items-start ${
                sidebarCollapsed
                  ? "w-full items-center justify-center gap-0"
                  : "justify-between gap-3"
              }`}
            >
              <div
                className={`min-w-0 overflow-hidden transition-[max-width,max-height,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  sidebarCollapsed
                    ? "max-h-0 max-w-0 -translate-x-2 opacity-0"
                    : "max-h-28 max-w-[220px] translate-x-0 opacity-100"
                }`}
              >
                <h1 className="font-headline text-3xl font-extrabold tracking-tight text-[var(--on-surface)]">
                  {text.settings.title}
                </h1>
                <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
                  {text.settings.sideDescription}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((current) => !current)}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--surface-container-lowest)] text-[var(--on-surface-variant)] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-[var(--surface)] hover:text-[var(--primary)]"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" strokeWidth={1.8} />
                ) : (
                  <PanelLeftClose className="h-4 w-4" strokeWidth={1.8} />
                )}
              </button>
            </div>
          </div>

          <nav
            className={`min-h-0 flex-1 overflow-y-auto ${
              sidebarCollapsed ? "space-y-1.5 px-2 py-2" : "space-y-2 px-4 py-4"
            }`}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center transition-all duration-200 ${
                    active
                      ? "bg-[var(--surface-container-lowest)] text-[var(--primary)] shadow-sm"
                      : "text-[var(--on-surface-variant)] hover:bg-[color:color-mix(in_srgb,var(--surface-container-lowest)_60%,transparent)] hover:text-[var(--on-surface)]"
                  } ${
                    sidebarCollapsed
                      ? "mx-auto h-12 w-12 justify-center rounded-2xl px-0"
                      : "w-full gap-3 rounded-2xl px-4 py-3 text-left"
                  }`}
                  title={tab.label}
                  aria-label={tab.label}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                  <span
                    className={`overflow-hidden whitespace-nowrap font-bold transition-[max-width,opacity,margin,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      sidebarCollapsed
                        ? "ml-0 max-w-0 translate-x-[-6px] opacity-0"
                        : "ml-0 max-w-[140px] translate-x-0 opacity-100"
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="custom-scrollbar min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-4 lg:px-8 lg:py-6">
          <section className="px-1 py-2">
            <h2 className="font-headline text-4xl font-extrabold tracking-tight text-[var(--on-surface)]">
              {activeTabMeta?.label || text.settings.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-[var(--on-surface-variant)] lg:text-base">
              {getHeaderDescription()}
            </p>
          </section>

          {activeTab === "general" ? renderGeneralTab() : null}
          {activeTab === "providers" ? renderProvidersTab() : null}
          {activeTab === "glossary" ? renderGlossaryTab() : null}
        </div>
      </div>
    </div>
  );
}
