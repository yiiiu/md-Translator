"use client";

import {
  Filter as FilterIcon,
  PencilLine as EditIcon,
  Download as DownloadIcon,
  FileUp as FileUpIcon,
  Plus as PlusIcon,
  Power as ToggleIcon,
  Search as SearchIcon,
  Trash2 as DeleteIcon,
} from "lucide-react";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type { UiLanguage } from "@/lib/app-settings";
import { formatUiText, getUiText } from "@/lib/ui-text";
import {
  createGlossaryTerm,
  deleteGlossaryTerm,
  fetchGlossaryTerms,
  importGlossaryCsv,
  type GlossaryImportErrorResponse,
  type GlossaryTermRequest,
  type GlossaryTermResponse,
  updateGlossaryTerm,
} from "@/services/api";
import ConfirmDialog from "./ui/ConfirmDialog";
import AppSelect, { type AppSelectOption } from "./ui/AppSelect";

type GlossaryManagerProps = {
  initialTerms: GlossaryTermResponse[];
  initialSourceLanguages: string[];
  initialTargetLanguages: string[];
  embedded?: boolean;
  showHeader?: boolean;
  uiLanguage?: UiLanguage;
};

type GlossaryFormState = GlossaryTermRequest & {
  enabled: boolean;
};

const EMPTY_FORM: GlossaryFormState = {
  source_term: "",
  target_term: "",
  source_lang: "en",
  target_lang: "zh-CN",
  note: "",
  enabled: true,
};

const ALL_SOURCE_LANG_VALUE = "__all_source_lang__";
const ALL_TARGET_LANG_VALUE = "__all_target_lang__";
const IMPORT_RESULT_TIMEOUT_MS = 8000;

type GlossaryImportResult = {
  inserted: number;
  skipped: number;
  errors: GlossaryImportErrorResponse[];
  tone: "success" | "error" | "mixed";
  message?: string;
};

function buildGlossaryTemplateCsv() {
  const rows = [
    ["source_term", "target_term", "source_lang", "target_lang", "note", "enabled"],
    ["button", "按钮", "en", "zh-CN", "UI label", "true"],
    ["provider", "提供商", "en", "zh-CN", "AI provider settings", "true"],
    ["glossary", "术语表", "en", "zh-CN", "Settings tab label", "true"],
  ];

  return `\uFEFF${rows
    .map((columns) =>
      columns
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\r\n")}`;
}

function readFileAsUtf8(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file, "utf-8");
  });
}

async function loadGlossaryData(filters: {
  q?: string;
  enabled?: string;
  source_lang?: string;
  target_lang?: string;
}) {
  return fetchGlossaryTerms(filters);
}

export default function GlossaryManager({
  initialTerms,
  initialSourceLanguages,
  initialTargetLanguages,
  embedded = false,
  showHeader = true,
  uiLanguage = "en",
}: GlossaryManagerProps) {
  const glossaryText = getUiText(uiLanguage).glossary as ReturnType<
    typeof getUiText
  >["glossary"] & {
    downloadTemplate: string;
    importCsv: string;
    importingCsv: string;
    importReadFailed: string;
    importFailed: string;
    importSummary: string;
    importSummaryNoSkipped: string;
    importErrorsTitle: string;
    importRowLabel: string;
    importFormatStage: string;
    importValidationStage: string;
    importDbStage: string;
  };
  const [terms, setTerms] = useState(initialTerms);
  const [sourceLanguages, setSourceLanguages] = useState(initialSourceLanguages);
  const [targetLanguages, setTargetLanguages] = useState(initialTargetLanguages);
  const [query, setQuery] = useState("");
  const [enabledFilter, setEnabledFilter] = useState("all");
  const [sourceLangFilter, setSourceLangFilter] = useState("");
  const [targetLangFilter, setTargetLangFilter] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingTerm, setEditingTerm] = useState<GlossaryTermResponse | null>(null);
  const [formState, setFormState] = useState<GlossaryFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<GlossaryImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmDeleteTerm, setConfirmDeleteTerm] =
    useState<GlossaryTermResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deferredQuery = useDeferredValue(query);
  const sourceLanguageOptions: AppSelectOption[] = [
    { value: ALL_SOURCE_LANG_VALUE, label: glossaryText.allSourceLangs },
    ...sourceLanguages.map((language) => ({
      value: language,
      label: language,
    })),
  ];
  const targetLanguageOptions: AppSelectOption[] = [
    { value: ALL_TARGET_LANG_VALUE, label: glossaryText.allTargetLangs },
    ...targetLanguages.map((language) => ({
      value: language,
      label: language,
    })),
  ];
  const dialogCancelLabel = uiLanguage === "zh-CN" ? "取消" : "Cancel";
  const glossaryDeleteTitle =
    uiLanguage === "zh-CN" ? "删除术语" : "Delete glossary term";

  useEffect(() => {
    let active = true;

    setLoading(true);
    setErrorMessage(null);

    void loadGlossaryData({
      q: deferredQuery,
      enabled: enabledFilter === "all" ? "" : enabledFilter,
      source_lang: sourceLangFilter,
      target_lang: targetLangFilter,
    })
      .then((data) => {
        if (!active) {
          return;
        }

        setTerms(data.terms || []);
        setSourceLanguages(data.source_languages || []);
        setTargetLanguages(data.target_languages || []);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : glossaryText.saveFailed
        );
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    deferredQuery,
    enabledFilter,
    glossaryText.saveFailed,
    sourceLangFilter,
    targetLangFilter,
  ]);

  useEffect(() => {
    if (!importResult) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setImportResult(null);
    }, IMPORT_RESULT_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [importResult]);

  const refreshTerms = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await loadGlossaryData({
        q: deferredQuery,
        enabled: enabledFilter === "all" ? "" : enabledFilter,
        source_lang: sourceLangFilter,
        target_lang: targetLangFilter,
      });

      setTerms(data.terms || []);
      setSourceLanguages(data.source_languages || []);
      setTargetLanguages(data.target_languages || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : glossaryText.saveFailed
      );
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTerm(null);
    setFormState(EMPTY_FORM);
    setErrorMessage(null);
    setShowDialog(true);
  };

  const openEditDialog = (term: GlossaryTermResponse) => {
    setEditingTerm(term);
    setFormState({
      source_term: term.source_term,
      target_term: term.target_term,
      source_lang: term.source_lang,
      target_lang: term.target_lang,
      note: term.note,
      enabled: Boolean(term.enabled),
    });
    setErrorMessage(null);
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formState.source_term.trim() || !formState.target_term.trim()) {
      setErrorMessage(glossaryText.requiredTerms);
      return;
    }

    if (!formState.source_lang.trim() || !formState.target_lang.trim()) {
      setErrorMessage(glossaryText.requiredLangs);
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        source_term: formState.source_term.trim(),
        target_term: formState.target_term.trim(),
        source_lang: formState.source_lang.trim(),
        target_lang: formState.target_lang.trim(),
        note: formState.note?.trim() || "",
        enabled: formState.enabled,
      };

      const result = editingTerm
        ? await updateGlossaryTerm(editingTerm.id, payload)
        : await createGlossaryTerm(payload);

      if (!result.ok) {
        setErrorMessage(result.error || glossaryText.saveFailed);
        return;
      }

      setShowDialog(false);
      await refreshTerms();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : glossaryText.saveFailed
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (term: GlossaryTermResponse) => {
    setConfirmDeleteTerm(term);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTerm) {
      return;
    }

    setErrorMessage(null);
    const result = await deleteGlossaryTerm(confirmDeleteTerm.id);
    if (!result.ok) {
      setErrorMessage(result.error || glossaryText.deleteFailed);
      return;
    }

    setConfirmDeleteTerm(null);
    await refreshTerms();
  };

  const handleToggleEnabled = async (term: GlossaryTermResponse) => {
    setErrorMessage(null);
    const result = await updateGlossaryTerm(term.id, {
      enabled: !Boolean(term.enabled),
    });

    if (!result.ok) {
      setErrorMessage(result.error || glossaryText.toggleFailed);
      return;
    }

    await refreshTerms();
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([buildGlossaryTemplateCsv()], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "glossary-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setImporting(true);
    setImportResult(null);
    setErrorMessage(null);

    try {
      const csv = await readFileAsUtf8(file);
      const result = await importGlossaryCsv(csv);
      const importErrors = result.errors || [];

      if (result.inserted > 0) {
        await refreshTerms();
      }

      const tone =
        importErrors.length === 0
          ? "success"
          : result.inserted > 0
            ? "mixed"
            : "error";

      setImportResult({
        inserted: result.inserted,
        skipped: result.skipped,
        errors: importErrors,
        tone,
        message: result.error,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message === "Failed to read file"
          ? glossaryText.importReadFailed
          : error instanceof Error
            ? error.message
            : glossaryText.importFailed;

      setImportResult({
        inserted: 0,
        skipped: 0,
        errors: [],
        tone: "error",
        message,
      });
    } finally {
      setImporting(false);
    }
  };

  const importToneClasses =
    importResult?.tone === "success"
      ? "bg-[var(--secondary-container)] text-[var(--on-surface)]"
      : importResult?.tone === "mixed"
        ? "bg-[color:color-mix(in_srgb,var(--secondary-container)_65%,#fff4dd)] text-[var(--on-surface)]"
        : "bg-[var(--error-container)] text-[var(--error)]";

  const getImportStageLabel = (stage: GlossaryImportErrorResponse["stage"]) => {
    if (stage === "parse") {
      return glossaryText.importFormatStage;
    }

    if (stage === "db") {
      return glossaryText.importDbStage;
    }

    return glossaryText.importValidationStage;
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div
          className={`flex flex-col justify-between gap-6 ${
            showHeader ? "lg:flex-row lg:items-end" : "lg:flex-row lg:items-center"
          }`}
        >
          {showHeader ? (
            <div className="space-y-3">
              <span className="rounded-full bg-[var(--secondary-container)] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[var(--on-surface-variant)]">
                {terms.length} {glossaryText.tag}
              </span>
              <div>
                <h2 className="font-headline text-4xl font-extrabold tracking-tight text-[var(--on-surface)]">
                  {embedded ? glossaryText.embeddedTitle : glossaryText.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-[var(--on-surface-variant)] lg:text-base">
                  {embedded
                    ? glossaryText.embeddedDescription
                    : glossaryText.description}
                </p>
              </div>
            </div>
          ) : (
            <span className="rounded-full bg-[var(--secondary-container)] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[var(--on-surface-variant)]">
              {terms.length} {glossaryText.tag}
            </span>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--surface-container-lowest)] px-4 py-3 text-sm font-bold text-[var(--primary)] shadow-sm transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <DownloadIcon className="h-4 w-4" strokeWidth={1.8} />
              {glossaryText.downloadTemplate}
            </button>
            <label
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition ${
                importing
                  ? "cursor-not-allowed bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] opacity-55"
                  : "cursor-pointer bg-[var(--surface-container-lowest)] text-[var(--primary)] hover:bg-[var(--surface)]"
              }`}
            >
              <FileUpIcon className="h-4 w-4" strokeWidth={1.8} />
              {importing ? glossaryText.importingCsv : glossaryText.importCsv}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                disabled={importing}
                onChange={(event) => void handleImportFileChange(event)}
              />
            </label>
            <button
              type="button"
              onClick={openCreateDialog}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#003ec7] to-[#0052ff] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_32px_rgba(0,82,255,0.22)] transition hover:shadow-[0_20px_42px_rgba(0,82,255,0.32)]"
            >
              <PlusIcon className="h-4 w-4" strokeWidth={1.8} />
              {glossaryText.add}
            </button>
          </div>
        </div>

        <div className="rounded-[1.25rem] bg-[var(--surface-container-lowest)] p-4 shadow-[0_24px_48px_rgba(17,28,45,0.06)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: "all", label: glossaryText.allTerms },
                { value: "true", label: glossaryText.enabled },
                { value: "false", label: glossaryText.disabled },
              ].map((filter) => {
                const active = enabledFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setEnabledFilter(filter.value)}
                    className={
                      active
                        ? "rounded-xl bg-[var(--surface-container-lowest)] px-4 py-2 text-sm font-bold text-[var(--primary)] shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--primary)_18%,transparent)]"
                        : "rounded-xl px-4 py-2 text-sm font-semibold text-[var(--on-surface-variant)] transition hover:text-[var(--on-surface)]"
                    }
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <label className="relative block min-w-[280px]">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--on-surface-variant)]" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) =>
                    startTransition(() => setQuery(event.target.value))
                  }
                  placeholder={glossaryText.search}
                  className="w-full rounded-xl bg-[var(--surface)] py-3 pr-4 pl-11 text-sm text-[var(--on-surface)] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] transition placeholder:text-[color:color-mix(in_srgb,var(--on-surface-variant)_75%,transparent)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--primary)_20%,transparent)]"
                />
              </label>

              <AppSelect
                value={sourceLangFilter || ALL_SOURCE_LANG_VALUE}
                onValueChange={(value) =>
                  setSourceLangFilter(value === ALL_SOURCE_LANG_VALUE ? "" : value)
                }
                options={sourceLanguageOptions}
                ariaLabel={glossaryText.allSourceLangs}
                leading={
                  <FilterIcon className="h-4 w-4 shrink-0 text-[var(--on-surface-variant)]" strokeWidth={1.8} />
                }
                triggerClassName="w-full justify-between bg-[var(--surface)] px-3 py-3 text-sm shadow-none ring-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] hover:bg-[var(--surface-container-low)]"
              />

              <AppSelect
                value={targetLangFilter || ALL_TARGET_LANG_VALUE}
                onValueChange={(value) =>
                  setTargetLangFilter(value === ALL_TARGET_LANG_VALUE ? "" : value)
                }
                options={targetLanguageOptions}
                ariaLabel={glossaryText.allTargetLangs}
                leading={
                  <FilterIcon className="h-4 w-4 shrink-0 text-[var(--on-surface-variant)]" strokeWidth={1.8} />
                }
                triggerClassName="w-full justify-between bg-[var(--surface)] px-3 py-3 text-sm shadow-none ring-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] hover:bg-[var(--surface-container-low)]"
              />
            </div>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-xl bg-[#ffdad6] px-3 py-2 text-sm text-[#93000a]">
              {errorMessage}
            </p>
          ) : null}

          {importResult ? (
            <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${importToneClasses}`}>
              <p className="font-bold">
                {importResult.skipped > 0
                  ? formatUiText(glossaryText.importSummary, {
                      inserted: importResult.inserted,
                      skipped: importResult.skipped,
                    })
                  : formatUiText(glossaryText.importSummaryNoSkipped, {
                      inserted: importResult.inserted,
                    })}
              </p>
              {importResult.message ? (
                <p className="mt-2 text-sm">{importResult.message}</p>
              ) : null}
              {importResult.errors.length > 0 ? (
                <>
                  <p className="mt-2 font-semibold">
                    {formatUiText(glossaryText.importErrorsTitle, {
                      count: importResult.errors.length,
                    })}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {importResult.errors.map((item) => (
                      <li key={`${item.stage}-${item.rowNumber}-${item.message}`}>
                        {formatUiText(glossaryText.importRowLabel, {
                          row: item.rowNumber,
                        })}{" "}
                        [{getImportStageLabel(item.stage)}] {item.message}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="custom-scrollbar mt-4 max-h-[min(34rem,calc(100vh-24rem))] overflow-auto rounded-2xl">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="sticky top-0 z-10 bg-[color:color-mix(in_srgb,var(--surface-container-low)_95%,transparent)] text-[var(--on-surface-variant)] backdrop-blur-sm">
                  <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                    {glossaryText.originalTerm}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                    {glossaryText.translatedTerm}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                    {glossaryText.languagePair}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                    {glossaryText.note}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                    {glossaryText.status}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase text-right">
                    {glossaryText.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]">
                {terms.map((term) => (
                  <tr key={term.id} className="transition hover:bg-[color:color-mix(in_srgb,var(--surface-container-low)_35%,transparent)]">
                    <td className="px-6 py-5">
                      <span className="font-semibold text-[var(--on-surface)]">{term.source_term}</span>
                    </td>
                    <td className="px-6 py-5 text-[var(--on-surface-variant)]">{term.target_term}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-[var(--secondary-container)] px-2 py-1 text-[10px] font-black tracking-[0.18em] text-[var(--primary)] uppercase">
                          {term.source_lang}
                        </span>
                        <span className="text-[var(--on-surface-variant)]">to</span>
                        <span className="rounded-lg bg-[var(--surface-container-high)] px-2 py-1 text-[10px] font-black tracking-[0.18em] text-[var(--primary)] uppercase">
                          {term.target_lang}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-[280px] px-6 py-5 text-sm text-[var(--on-surface-variant)]">
                      {term.note || glossaryText.noNote}
                    </td>
                    <td className="px-6 py-5">
                      <button
                        type="button"
                        onClick={() => void handleToggleEnabled(term)}
                        className={
                          term.enabled
                            ? "rounded-full bg-[var(--secondary-container)] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[var(--primary)] uppercase"
                            : "rounded-full bg-[var(--surface-container-low)] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[var(--on-surface-variant)] uppercase"
                        }
                      >
                        {term.enabled ? glossaryText.enabled : glossaryText.disabled}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditDialog(term)}
                          className="rounded-lg p-2 text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container-high)] hover:text-[var(--primary)]"
                          title={glossaryText.editAction}
                        >
                          <EditIcon className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleEnabled(term)}
                          className="rounded-lg p-2 text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container-high)] hover:text-[var(--primary)]"
                          title={
                            term.enabled
                              ? glossaryText.disableAction
                              : glossaryText.enableAction
                          }
                        >
                          <ToggleIcon className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(term)}
                          className="rounded-lg p-2 text-[var(--on-surface-variant)] transition hover:bg-[var(--error-container)] hover:text-[var(--error)]"
                          title={glossaryText.deleteAction}
                        >
                          <DeleteIcon className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-[var(--on-surface-variant)]">{glossaryText.loading}</p>
          ) : null}

          {!loading && terms.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-[var(--surface-container-low)] px-6 py-10 text-center">
              <p className="font-headline text-xl font-extrabold text-[var(--on-surface)]">
                {glossaryText.emptyTitle}
              </p>
              <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
                {glossaryText.emptyDescription}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {showDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--surface)_55%,transparent)] p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[1.75rem] bg-[var(--surface)] p-6 shadow-[0_32px_64px_rgba(17,28,45,0.18)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_24%,transparent)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.24em] text-[var(--on-surface-variant)]">
                  {glossaryText.title}
                </p>
                <h3 className="font-headline mt-1 text-2xl font-extrabold tracking-tight text-[var(--on-surface)]">
                  {editingTerm ? glossaryText.editTerm : glossaryText.addTerm}
                </h3>
              </div>
              <span className="rounded-full bg-[var(--secondary-container)] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[var(--primary)] uppercase">
                {formState.enabled ? glossaryText.enabled : glossaryText.disabled}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-[var(--on-surface-variant)]">
                  {glossaryText.sourceTerm}
                </span>
                <input
                  type="text"
                  value={formState.source_term}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      source_term: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl bg-[var(--surface-container-lowest)] px-3 py-2 text-sm text-[var(--on-surface)] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] transition focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--primary)_25%,transparent)]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-[var(--on-surface-variant)]">
                  {glossaryText.targetTerm}
                </span>
                <input
                  type="text"
                  value={formState.target_term}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      target_term: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl bg-[var(--surface-container-lowest)] px-3 py-2 text-sm text-[var(--on-surface)] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] transition focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--primary)_25%,transparent)]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-[var(--on-surface-variant)]">
                  {glossaryText.sourceLang}
                </span>
                <input
                  type="text"
                  value={formState.source_lang}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      source_lang: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl bg-[var(--surface-container-lowest)] px-3 py-2 text-sm text-[var(--on-surface)] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] transition focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--primary)_25%,transparent)]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-[var(--on-surface-variant)]">
                  {glossaryText.targetLang}
                </span>
                <input
                  type="text"
                  value={formState.target_lang}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      target_lang: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl bg-[var(--surface-container-lowest)] px-3 py-2 text-sm text-[var(--on-surface)] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] transition focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--primary)_25%,transparent)]"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-bold text-[var(--on-surface-variant)]">
                {glossaryText.note}
              </span>
              <textarea
                value={formState.note}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                rows={4}
                className="w-full rounded-xl bg-[var(--surface-container-lowest)] px-3 py-2 text-sm text-[var(--on-surface)] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] transition focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--primary)_25%,transparent)]"
              />
            </label>

            <label className="mt-4 inline-flex items-center gap-3 rounded-xl bg-[var(--surface-container-low)] px-4 py-3 text-sm font-semibold text-[var(--on-surface-variant)]">
              <input
                type="checkbox"
                checked={formState.enabled}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-[var(--outline-variant)]"
              />
              {glossaryText.enableTerm}
            </label>

            {errorMessage ? (
              <p className="mt-4 rounded-xl bg-[var(--error-container)] px-3 py-2 text-sm text-[var(--error)]">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                className="rounded-xl bg-[var(--surface-container-lowest)] px-4 py-2 text-sm font-bold text-[var(--on-surface-variant)] shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)] transition hover:bg-[var(--surface-container-high)]"
              >
                {glossaryText.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={saving}
                className="rounded-xl bg-gradient-to-br from-[#003ec7] to-[#0052ff] px-4 py-2 text-sm font-bold text-white shadow-[0_14px_28px_rgba(0,82,255,0.22)] transition hover:shadow-[0_18px_36px_rgba(0,82,255,0.32)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {saving
                  ? getUiText(uiLanguage).provider.saving
                  : editingTerm
                    ? glossaryText.saveChanges
                    : glossaryText.createTerm}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmDeleteTerm)}
        title={glossaryDeleteTitle}
        description={
          confirmDeleteTerm
            ? formatUiText(glossaryText.deleteConfirm, {
                name: confirmDeleteTerm.source_term,
              })
            : ""
        }
        confirmLabel={glossaryText.deleteAction}
        cancelLabel={dialogCancelLabel}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteTerm(null)}
        tone="danger"
      />
    </>
  );
}
