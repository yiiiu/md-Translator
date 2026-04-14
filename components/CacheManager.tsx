"use client";

import { useEffect, useState } from "react";
import { clearCache, fetchCacheStats } from "@/services/api";
import { getUiText } from "@/lib/ui-text";
import { useAppSettingsStore } from "@/stores/app-settings";

type CacheSettingsText = {
  cacheTitle: string;
  cacheDescription: string;
  cacheClear: string;
  cacheClearing: string;
  cacheEntries: string;
  cacheSize: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function CacheManager() {
  const uiLanguage = useAppSettingsStore((state) => state.uiLanguage);
  const text = getUiText(uiLanguage).settings as ReturnType<typeof getUiText>["settings"] &
    CacheSettingsText;
  const [stats, setStats] = useState<{ count: number; sizeBytes: number } | null>(
    null
  );
  const [clearing, setClearing] = useState(false);

  const loadStats = async () => {
    const nextStats = await fetchCacheStats();
    if (!nextStats.error) {
      setStats({
        count: nextStats.count,
        sizeBytes: nextStats.sizeBytes,
      });
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearCache();
      await loadStats();
    } finally {
      setClearing(false);
    }
  };

  return (
    <section className="rounded-[1.5rem] bg-[var(--surface-container-lowest)] p-6 shadow-[0_24px_48px_rgba(17,28,45,0.06)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]">
      <div className="flex items-start gap-3">
        <div>
          <h3 className="font-headline text-xl font-extrabold tracking-tight text-[var(--on-surface)]">
            {text.cacheTitle}
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-[var(--on-surface-variant)]">
            {text.cacheDescription}
          </p>
        </div>
      </div>

      {stats ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-[var(--surface-container-low)] p-4">
            <p className="text-[11px] font-extrabold tracking-[0.22em] text-[var(--on-surface-variant)] uppercase">
              {text.cacheEntries}
            </p>
            <p className="font-headline mt-1 text-3xl font-extrabold text-[var(--on-surface)]">
              {stats.count}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface-container-low)] p-4">
            <p className="text-[11px] font-extrabold tracking-[0.22em] text-[var(--on-surface-variant)] uppercase">
              {text.cacheSize}
            </p>
            <p className="font-headline mt-1 text-3xl font-extrabold text-[var(--on-surface)]">
              {formatBytes(stats.sizeBytes)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 h-20 animate-pulse rounded-xl bg-[var(--surface-container-low)]" />
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => void handleClear()}
          disabled={clearing || stats?.count === 0}
          className="rounded-xl bg-[var(--error-container)] px-4 py-2 text-sm font-bold text-[var(--error)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {clearing ? text.cacheClearing : text.cacheClear}
        </button>
      </div>
    </section>
  );
}
