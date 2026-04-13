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
import {
  createGlossaryTerm,
  deleteGlossaryTerm,
  fetchGlossaryTerms,
  type GlossaryTermRequest,
  type GlossaryTermResponse,
  updateGlossaryTerm,
} from "@/services/api";

type GlossaryManagerProps = {
  initialTerms: GlossaryTermResponse[];
  initialSourceLanguages: string[];
  initialTargetLanguages: string[];
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
}: GlossaryManagerProps) {
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

  const deferredQuery = useDeferredValue(query);

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
          error instanceof Error ? error.message : "Failed to load glossary terms"
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
  }, [deferredQuery, enabledFilter, sourceLangFilter, targetLangFilter]);

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
        error instanceof Error ? error.message : "Failed to load glossary terms"
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
      setErrorMessage("Source and translated terms are required");
      return;
    }

    if (!formState.source_lang.trim() || !formState.target_lang.trim()) {
      setErrorMessage("Source and target languages are required");
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
        setErrorMessage(result.error || "Failed to save glossary term");
        return;
      }

      setShowDialog(false);
      await refreshTerms();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save glossary term");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (term: GlossaryTermResponse) => {
    if (!window.confirm(`Delete glossary term "${term.source_term}"?`)) {
      return;
    }

    setErrorMessage(null);
    const result = await deleteGlossaryTerm(term.id);
    if (!result.ok) {
      setErrorMessage(result.error || "Failed to delete glossary term");
      return;
    }

    await refreshTerms();
  };

  const handleToggleEnabled = async (term: GlossaryTermResponse) => {
    setErrorMessage(null);
    const result = await updateGlossaryTerm(term.id, {
      enabled: !Boolean(term.enabled),
    });

    if (!result.ok) {
      setErrorMessage(result.error || "Failed to update glossary status");
      return;
    }

    await refreshTerms();
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="space-y-3">
            <span className="rounded-full bg-[#d5e3fc] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[#57657a]">
              {terms.length} terms
            </span>
            <div>
              <h2 className="font-headline text-4xl font-extrabold tracking-tight text-[#111c2d]">
                Glossary
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[#434656] lg:text-base">
                Manage real translation terminology from your local database. Enabled
                terms act as your project-level source of truth.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateDialog}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#003ec7] to-[#0052ff] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_32px_rgba(0,82,255,0.22)] transition hover:shadow-[0_20px_42px_rgba(0,82,255,0.32)]"
          >
            <PlusIcon className="h-4 w-4" strokeWidth={1.8} />
            Add New Term
          </button>
        </div>

        <div className="rounded-[1.25rem] bg-white p-4 shadow-[0_24px_48px_rgba(17,28,45,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: "all", label: "All Terms" },
                { value: "true", label: "Enabled" },
                { value: "false", label: "Disabled" },
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
                  placeholder="Search by term or translation..."
                  className="w-full rounded-xl bg-[#f9f9ff] py-3 pr-4 pl-11 text-sm outline-none ring-1 ring-[#c3c5d9]/25 transition focus:ring-2 focus:ring-[#0052ff]/20"
                />
              </label>

              <label className="relative block">
                <FilterIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#737688]" />
                <select
                  value={sourceLangFilter}
                  onChange={(event) => setSourceLangFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl bg-[#f9f9ff] py-3 pr-4 pl-10 text-sm outline-none ring-1 ring-[#c3c5d9]/25 transition focus:ring-2 focus:ring-[#0052ff]/20"
                >
                  <option value="">All source langs</option>
                  {sourceLanguages.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>

              <label className="relative block">
                <FilterIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#737688]" />
                <select
                  value={targetLangFilter}
                  onChange={(event) => setTargetLangFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl bg-[#f9f9ff] py-3 pr-4 pl-10 text-sm outline-none ring-1 ring-[#c3c5d9]/25 transition focus:ring-2 focus:ring-[#0052ff]/20"
                >
                  <option value="">All target langs</option>
                  {targetLanguages.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-xl bg-[#ffdad6] px-3 py-2 text-sm text-[#93000a]">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#f0f3ff]/70 text-[#434656]">
                  <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                    Original Term
                  </th>
                  <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                    Translated Term
                  </th>
                  <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                    Language Pair
                  </th>
                  <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                    Note
                  </th>
                  <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase text-right">
                    Actions
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
                      {term.note || "No note"}
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
                        {term.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditDialog(term)}
                          className="rounded-lg p-2 text-[#434656] transition hover:bg-[#dee8ff] hover:text-[#003ec7]"
                          title="Edit term"
                        >
                          <EditIcon className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleEnabled(term)}
                          className="rounded-lg p-2 text-[#434656] transition hover:bg-[#dee8ff] hover:text-[#003ec7]"
                          title={term.enabled ? "Disable term" : "Enable term"}
                        >
                          <ToggleIcon className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(term)}
                          className="rounded-lg p-2 text-[#434656] transition hover:bg-[#ffdad6] hover:text-[#93000a]"
                          title="Delete term"
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
            <p className="mt-4 text-sm text-[#737688]">Loading glossary terms...</p>
          ) : null}

          {!loading && terms.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-[#f0f3ff] px-6 py-10 text-center">
              <p className="font-headline text-xl font-extrabold text-[#111c2d]">
                No glossary terms found
              </p>
              <p className="mt-2 text-sm text-[#57657a]">
                Adjust the current filters or create the first project term.
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
                  Glossary Term
                </p>
                <h3 className="font-headline mt-1 text-2xl font-extrabold tracking-tight text-[#111c2d]">
                  {editingTerm ? "Edit Term" : "Add New Term"}
                </h3>
              </div>
              <span className="rounded-full bg-[#d5e3fc] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[#003ec7] uppercase">
                {formState.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-[#434656]">Source Term</span>
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
                  Translated Term
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
                <span className="mb-1 block text-sm font-bold text-[#434656]">Source Lang</span>
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
                <span className="mb-1 block text-sm font-bold text-[#434656]">Target Lang</span>
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
              <span className="mb-1 block text-sm font-bold text-[#434656]">Note</span>
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
              Enable this term for active translation
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
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={saving}
                className="rounded-xl bg-gradient-to-br from-[#003ec7] to-[#0052ff] px-4 py-2 text-sm font-bold text-white shadow-[0_14px_28px_rgba(0,82,255,0.22)] transition hover:shadow-[0_18px_36px_rgba(0,82,255,0.32)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {saving ? "Saving..." : editingTerm ? "Save Changes" : "Create Term"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
