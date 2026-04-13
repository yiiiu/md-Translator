import AppHeader from "@/components/AppHeader";
import GlossaryManager from "@/components/GlossaryManager";
import { listGlossaryLanguages, listGlossaryTerms } from "@/lib/db";

export default function GlossaryPage() {
  const initialTerms = listGlossaryTerms();
  const languages = listGlossaryLanguages();

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#f9f9ff] text-[#111c2d]">
      <AppHeader />
      <div className="flex-1 overflow-y-auto bg-[#f0f3ff] px-4 py-4 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-7xl">
          <GlossaryManager
            initialTerms={initialTerms}
            initialSourceLanguages={languages.source_languages}
            initialTargetLanguages={languages.target_languages}
          />
        </div>
      </div>
    </main>
  );
}
