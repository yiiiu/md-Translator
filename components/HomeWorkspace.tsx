"use client";

import { useRef } from "react";
import type { AppSettings } from "@/lib/app-settings";
import AppHeader from "@/components/AppHeader";
import InputArea from "@/components/InputArea";
import SplitView from "@/components/SplitView";
import StatusBar from "@/components/StatusBar";
import Toolbar from "@/components/Toolbar";
import { useTranslationStore } from "@/stores/translation";

export default function HomeWorkspace({
  initialSettings,
}: {
  initialSettings: AppSettings;
}) {
  const initializedRef = useRef(false);

  if (!initializedRef.current) {
    useTranslationStore.getState().applyAppSettings(initialSettings);
    initializedRef.current = true;
  }

  return (
    <main className="flex h-screen overflow-hidden flex-col bg-[#f9f9ff] text-[#111c2d]">
      <AppHeader uiLanguage={initialSettings.ui_language} />
      <Toolbar uiLanguage={initialSettings.ui_language} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-[#f0f3ff] px-4 py-4 lg:px-8 lg:py-6">
        <SplitView />
        <StatusBar />
      </div>
      <InputArea />
    </main>
  );
}
