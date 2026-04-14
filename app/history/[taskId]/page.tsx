import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import HistoryDetail from "@/components/HistoryDetail";
import { getAppSettings } from "@/lib/db";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const settings = getAppSettings();

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[var(--background)] text-[var(--on-surface)]">
      <AppHeader uiLanguage={settings.ui_language} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-[var(--surface-container-low)] px-4 py-4 lg:px-8 lg:py-6">
        <div className="flex items-center gap-3">
          <Link
            href="/history"
            className="text-sm font-bold text-[var(--on-surface-variant)] transition hover:text-[var(--primary)]"
          >
            History
          </Link>
          <span className="text-xs text-[var(--on-surface-variant)]">/</span>
          <span className="font-mono text-xs text-[var(--on-surface-variant)]">
            {taskId.slice(0, 8)}
          </span>
        </div>
        <div className="min-h-0 flex-1">
          <HistoryDetail taskId={taskId} />
        </div>
      </div>
    </main>
  );
}
