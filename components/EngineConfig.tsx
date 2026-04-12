"use client";

import { useEffect, useState } from "react";
import { configureEngine, fetchEngines } from "@/services/api";

interface Props {
  onClose: () => void;
}

export default function EngineConfig({ onClose }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [baseUrl, setBaseUrl] = useState("");
  const [configured, setConfigured] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchEngines().then((data) => {
      if (!active) return;
      const openai = data.engines?.find((engine) => engine.id === "openai");
      setConfigured(openai?.configured ?? false);
    });

    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) return;

    setSaving(true);
    try {
      await configureEngine("openai", {
        api_key: apiKey,
        model: model || undefined,
        base_url: baseUrl || undefined,
      });
      setConfigured(true);
      onClose();
    } catch (error) {
      console.error("Failed to save config:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Engine Config
            </p>
            <h2 className="mt-1 text-xl font-semibold text-stone-900">OpenAI 配置</h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              configured ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
            }`}
          >
            {configured ? "已配置" : "未配置"}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-..."
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Model</span>
            <input
              type="text"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="gpt-4o"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Base URL
            </span>
            <input
              type="text"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || saving}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
