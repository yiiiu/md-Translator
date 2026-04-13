import AppHeader from "@/components/AppHeader";
import SettingsWorkspace from "@/components/SettingsWorkspace";
import { getAppSettings, listGlossaryLanguages, listGlossaryTerms } from "@/lib/db";

function normalizeTab(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const params = await searchParams;
  const settings = getAppSettings();
  const initialTerms = listGlossaryTerms();
  const languages = listGlossaryLanguages();

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#f9f9ff] text-[#111c2d]">
      <AppHeader uiLanguage={settings.ui_language} />
      <div className="min-h-0 flex-1 overflow-hidden bg-[#f0f3ff]">
        <SettingsWorkspace
          initialTab={normalizeTab(params.tab)}
          initialSettings={settings}
          initialTerms={initialTerms}
          initialSourceLanguages={languages.source_languages}
          initialTargetLanguages={languages.target_languages}
        />
      </div>
    </main>
  );
}
