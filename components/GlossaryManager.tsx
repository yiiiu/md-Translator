"use client";

import {
  Filter as FilterIcon,
  PencilLine as EditIcon,
  Plus as PlusIcon,
  Power as ToggleIcon,
  Search as SearchIcon,
  Trash2 as DeleteIcon,
} from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import type { UiLanguage } from "@/lib/app-settings";
import { formatUiText, getUiText } from "@/lib/ui-text";
import {
  createGlossaryTerm,
  deleteGlossaryTerm,
  fetchGlossaryTerms,
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
  const glossaryText = getUiText(uiLanguage).glossary;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmDeleteTerm, setConfirmDeleteTerm] =
    useState<GlossaryTermResponse | null>(null);

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
              <span className="rounded-full bg-[#d5e3fc] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[#57657a]">
                {terms.length} {glossaryText.tag}
              </span>
              <div>
                <h2 className="font-headline text-4xl font-extrabold tracking-tight text-[#111c2d]">
                  {embedded ? glossaryText.embeddedTitle : glossaryText.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-[#434656] lg:text-base">
                  {embedded
                    ? glossaryText.embeddedDescription
                    : glossaryText.description}
                </p>
              </div>
            </div>
          ) : (
            <span className="rounded-full bg-[#d5e3fc] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[#57657a]">
              {terms.length} {glossaryText.tag}
            </span>
          )}

          <button
            type="button"
            onClick={openCreateDialog}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#003ec7] to-[#0052ff] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_32px_rgba(0,82,255,0.22)] transition hover:shadow-[0_20px_42px_rgba(0,82,255,0.32)]"
          >
            <PlusIcon className="h-4 w-4" strokeWidth={1.8} />
            {glossaryText.add}
          </button>
        </div>

        <div className="rounded-[1.25rem] bg-white p-4 shadow-[0_24px_48px_rgba(17,28,45,0.06)]">
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
                        ? "rounded-xl bg-[#ffffff] px-4 py-2 text-sm font-bold text-[#003ec7] shadow-sm"
                        : "rounded-xl px-4 py-2 text-sm font-semibold text-[#57657a] transition hover:text-[#111c2d]"
                    }
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <label className="relative block min-w-[280px]">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#737688]" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) =>
                    startTransition(() => setQuery(event.target.value))
                  }
                  placeholder={glossaryText.search}
                  className="w-full rounded-xl bg-[#f9f9ff] py-3 pr-4 pl-11 text-sm outline-none ring-1 ring-[#c3c5d9]/25 transition focus:ring-2 focus:ring-[#0052ff]/20"
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
                  <FilterIcon className="h-4 w-4 shrink-0 text-[#737688]" strokeWidth={1.8} />
                }
                triggerClassName="w-full justify-between bg-[#f9f9ff] px-3 py-3 text-sm shadow-none ring-[#c3c5d9]/25 hover:bg-[#f5f7ff]"
              />

              <AppSelect
                value={targetLangFilter || ALL_TARGET_LANG_VALUE}
                onValueChange={(value) =>
                  setTargetLangFilter(value === ALL_TARGET_LANG_VALUE ? "" : value)
                }
                options={targetLanguageOptions}
                ariaLabel={glossaryText.allTargetLangs}
                leading={
                  <FilterIcon className="h-4 w-4 shrink-0 text-[#737688]" strokeWidth={1.8} />
                }
                triggerClassName="w-full justify-between bg-[#f9f9ff] px-3 py-3 text-sm shadow-none ring-[#c3c5d9]/25 hover:bg-[#f5f7ff]"
              />
            </div>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-xl bg-[#ffdad6] px-3 py-2 text-sm text-[#93000a]">
              {errorMessage}
            </p>
          ) : null}

          <div className="custom-scrollbar mt-4 max-h-[min(34rem,calc(100vh-24rem))] overflow-auto rounded-2xl">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="sticky top-0 z-10 bg-[#f0f3ff]/95 text-[#434656] backdrop-blur-sm">
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
              <tbody className="divide-y divide-[#c3c5d9]/15">
                {terms.map((term) => (
                  <tr key={term.id} className="transition hover:bg-[#f0f3ff]/35">
                    <td className="px-6 py-5">
                      <span className="font-semibold text-[#111c2d]">{term.source_term}</span>
                    </td>
                    <td className="px-6 py-5 text-[#434656]">{term.target_term}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-[#d5e3fc] px-2 py-1 text-[10px] font-black tracking-[0.18em] text-[#003ec7] uppercase">
                          {term.source_lang}
                        </span>
                        <span className="text-[#737688]">to</span>
                        <span className="rounded-lg bg-[#dee8ff] px-2 py-1 text-[10px] font-black tracking-[0.18em] text-[#003ec7] uppercase">
                          {term.target_lang}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-[280px] px-6 py-5 text-sm text-[#57657a]">
                      {term.note || glossaryText.noNote}
                    </td>
                    <td className="px-6 py-5">
                      <button
                        type="button"
                        onClick={() => void handleToggleEnabled(term)}
                        className={
                          term.enabled
                            ? "rounded-full bg-[#d5e3fc] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[#003ec7] uppercase"
                            : "rounded-full bg-[#f0f3ff] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[#737688] uppercase"
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
                          className="rounded-lg p-2 text-[#434656] transition hover:bg-[#dee8ff] hover:text-[#003ec7]"
                          title={glossaryText.editAction}
                        >
                          <EditIcon className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleEnabled(term)}
                          className="rounded-lg p-2 text-[#434656] transition hover:bg-[#dee8ff] hover:text-[#003ec7]"
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
                          className="rounded-lg p-2 text-[#434656] transition hover:bg-[#ffdad6] hover:text-[#93000a]"
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
            <p className="mt-4 text-sm text-[#737688]">{glossaryText.loading}</p>
          ) : null}

          {!loading && terms.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-[#f0f3ff] px-6 py-10 text-center">
              <p className="font-headline text-xl font-extrabold text-[#111c2d]">
                {glossaryText.emptyTitle}
              </p>
              <p className="mt-2 text-sm text-[#57657a]">
                {glossaryText.emptyDescription}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {showDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111c2d]/35 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[1.75rem] bg-[#f9f9ff] p-6 shadow-[0_32px_64px_rgba(17,28,45,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.24em] text-[#434656]">
                  {glossaryText.title}
                </p>
                <h3 className="font-headline mt-1 text-2xl font-extrabold tracking-tight text-[#111c2d]">
                  {editingTerm ? glossaryText.editTerm : glossaryText.addTerm}
                </h3>
              </div>
              <span className="rounded-full bg-[#d5e3fc] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[#003ec7] uppercase">
                {formState.enabled ? glossaryText.enabled : glossaryText.disabled}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-[#434656]">
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
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm outline-none ring-1 ring-[#c3c5d9]/25 transition focus:ring-2 focus:ring-[#0052ff]/25"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-[#434656]">
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
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm outline-none ring-1 ring-[#c3c5d9]/25 transition focus:ring-2 focus:ring-[#0052ff]/25"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-[#434656]">
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
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm outline-none ring-1 ring-[#c3c5d9]/25 transition focus:ring-2 focus:ring-[#0052ff]/25"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-[#434656]">
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
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm outline-none ring-1 ring-[#c3c5d9]/25 transition focus:ring-2 focus:ring-[#0052ff]/25"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-bold text-[#434656]">
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
                className="w-full rounded-xl bg-white px-3 py-2 text-sm outline-none ring-1 ring-[#c3c5d9]/25 transition focus:ring-2 focus:ring-[#0052ff]/25"
              />
            </label>

            <label className="mt-4 inline-flex items-center gap-3 rounded-xl bg-[#f0f3ff] px-4 py-3 text-sm font-semibold text-[#434656]">
              <input
                type="checkbox"
                checked={formState.enabled}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-[#c3c5d9]"
              />
              {glossaryText.enableTerm}
            </label>

            {errorMessage ? (
              <p className="mt-4 rounded-xl bg-[#ffdad6] px-3 py-2 text-sm text-[#93000a]">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#434656] shadow-sm transition hover:bg-[#dee8ff]"
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
