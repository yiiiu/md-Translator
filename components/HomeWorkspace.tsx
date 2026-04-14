"use client";

import { useRef } from "react";
import type { AppSettings } from "@/lib/app-settings";
import AppHeader from "@/components/AppHeader";
import InputArea from "@/components/InputArea";
import SplitView from "@/components/SplitView";
import StatusBar from "@/components/StatusBar";
import Toolbar from "@/components/Toolbar";
import { useAppSettingsStore } from "@/stores/app-settings";
import { useTranslationStore } from "@/stores/translation";

export default function HomeWorkspace({
  initialSettings,
}: {
  initialSettings: AppSettings;
}) {
  const initializedRef = useRef(false);

  if (!initializedRef.current) {
    const previousDefaultEngine = useAppSettingsStore.getState().defaultEngine;
    const previousDefaultTargetLang =
      useAppSettingsStore.getState().defaultTargetLang;
    const translationState = useTranslationStore.getState();

    useAppSettingsStore.getState().applyAppSettings(initialSettings);

    if (
      !translationState.rawInput &&
      translationState.engine === previousDefaultEngine
    ) {
      translationState.setEngine(initialSettings.default_engine);
    }

    if (
      !translationState.rawInput &&
      translationState.targetLang === previousDefaultTargetLang
    ) {
      translationState.setTargetLang(initialSettings.default_target_lang);
    }

    initializedRef.current = true;
  }

  return (
    <main className="flex h-screen overflow-hidden flex-col bg-[var(--background)] text-[var(--on-surface)]">
      <AppHeader uiLanguage={initialSettings.ui_language} />
      <Toolbar uiLanguage={initialSettings.ui_language} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-[var(--surface-container-low)] px-4 py-4 lg:px-8 lg:py-6">
        <SplitView />
        <StatusBar />
      </div>
      <InputArea />
    </main>
  );
}
