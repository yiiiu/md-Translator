import AppHeader from "@/components/AppHeader";
import HistoryWorkspace from "@/components/HistoryWorkspace";
import { getAllEngineConfigs, getAppSettings, listTasks } from "@/lib/db";
import { normalizeQuery, normalizeStatusFilter } from "@/lib/history";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const settings = getAppSettings();
  const q = normalizeQuery(params.q);
  const statusFilter = normalizeStatusFilter(params.status);
  const tasks = listTasks({ q });
  const engineConfigs = getAllEngineConfigs();
  const engineNameMap: Record<string, string> = {
    openai: "OpenAI",
    ...Object.fromEntries(engineConfigs.map((config) => [config.id, config.name])),
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[var(--background)] text-[var(--on-surface)]">
      <AppHeader uiLanguage={settings.ui_language} />
      <div className="flex-1 overflow-y-auto bg-[var(--surface-container-low)] px-4 py-4 lg:px-8 lg:py-6">
        <HistoryWorkspace
          initialTasks={tasks}
          statusFilter={statusFilter}
          q={q}
          uiLanguage={settings.ui_language}
          engineNameMap={engineNameMap}
        />
      </div>
    </main>
  );
}
