"use client";

import { Plus as PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { UiLanguage } from "@/lib/app-settings";
import { getUiText } from "@/lib/ui-text";
import { createEngine, fetchEngines } from "@/services/api";
import EngineConfig from "./EngineConfig";
import ProviderLogo from "./ProviderLogo";

interface EngineOption {
  value: string;
  label: string;
  baseUrl: string;
  builtin: boolean;
  configured: boolean;
}

const DEFAULT_ENGINE_OPTIONS: EngineOption[] = [
  {
    value: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    builtin: true,
    configured: false,
  },
];

export default function ProviderSettingsManager({
  uiLanguage,
}: {
  uiLanguage: UiLanguage;
}) {
  const text = getUiText(uiLanguage);
  const [creatingProvider, setCreatingProvider] = useState(false);
  const [engineOptions, setEngineOptions] = useState<EngineOption[]>(
    DEFAULT_ENGINE_OPTIONS
  );
  const [selectedEngineId, setSelectedEngineId] = useState("openai");

  const refreshEngineOptions = async (preferredEngineId?: string) => {
    try {
      const data = await fetchEngines();
      const nextOptions =
        data.engines?.map((item) => ({
          value: item.id,
          label: item.name,
          baseUrl: item.base_url || "",
          builtin: item.builtin ?? item.id === "openai",
          configured: Boolean(item.configured),
        })) || DEFAULT_ENGINE_OPTIONS;

      setEngineOptions(nextOptions);
      setSelectedEngineId((current) => {
        const nextSelectedId = preferredEngineId || current;
        if (nextOptions.some((option) => option.value === nextSelectedId)) {
          return nextSelectedId;
        }
        return nextOptions[0]?.value || "openai";
      });
    } catch (error) {
      console.error("Failed to load engines:", error);
    }
  };

  useEffect(() => {
    void refreshEngineOptions();
  }, []);

  const selectedEngine =
    engineOptions.find((option) => option.value === selectedEngineId) ||
    DEFAULT_ENGINE_OPTIONS[0];

  const providerCountLabel = useMemo(() => `${engineOptions.length}`, [engineOptions.length]);

  const handleCreateProvider = async () => {
    setCreatingProvider(true);

    try {
      const created = await createEngine();
      if (!created.ok || !created.id) {
        return;
      }

      await refreshEngineOptions(created.id);
    } catch (error) {
      console.error("Failed to create provider:", error);
    } finally {
      setCreatingProvider(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
      <aside className="flex min-h-[28rem] flex-col rounded-[1.5rem] bg-white p-5 shadow-[0_24px_48px_rgba(17,28,45,0.06)] xl:max-h-[calc(100vh-14rem)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.24em] text-[#434656]">
              {text.settings.providers}
            </p>
            <p className="mt-1 text-sm text-[#737688]">{providerCountLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleCreateProvider}
            disabled={creatingProvider}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#003ec7] to-[#0052ff] px-3 py-2 text-sm font-bold text-white shadow-[0_16px_32px_rgba(0,82,255,0.22)] transition hover:shadow-[0_20px_42px_rgba(0,82,255,0.32)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <PlusIcon className="h-4 w-4" strokeWidth={1.8} />
            {text.settings.addProvider}
          </button>
        </div>

        <div className="custom-scrollbar mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {engineOptions.map((option) => {
            const active = option.value === selectedEngineId;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedEngineId(option.value)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  active
                    ? "bg-[#f0f3ff] text-[#003ec7] ring-1 ring-[#0052ff]/15"
                    : "text-[#434656] hover:bg-[#f9f9ff]"
                }`}
              >
                <ProviderLogo
                  engineId={option.value}
                  label={option.label}
                  baseUrl={option.baseUrl}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{option.label}</p>
                  <p className="truncate text-xs text-[#737688]">
                    {option.baseUrl || "https://api.openai.com/v1"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-extrabold tracking-[0.16em] ${
                    option.configured
                      ? "bg-[#d5e3fc] text-[#003ec7]"
                      : "bg-[#f0f3ff] text-[#737688]"
                  }`}
                >
                  {option.configured
                    ? text.provider.configured
                    : text.provider.notConfigured}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <EngineConfig
        engineId={selectedEngine.value}
        embedded
        uiLanguage={uiLanguage}
        onSaved={() => {
          void refreshEngineOptions(selectedEngine.value);
        }}
        onDeleteProvider={(deletedId) => {
          const fallback = deletedId === selectedEngine.value ? "openai" : selectedEngine.value;
          void refreshEngineOptions(fallback);
        }}
      />
    </div>
  );
}
