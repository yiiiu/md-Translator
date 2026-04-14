"use client";

import Link from "next/link";
import { Trash2 as DeleteIcon } from "lucide-react";
import { useState } from "react";
import { type UiLanguage } from "@/lib/app-settings";
import {
  buildHistoryFilterHref,
  buildHistoryItems,
  filterHistoryItems,
  formatHistoryDate,
  summarizeHistory,
  type HistoryStatusFilter,
  type HistoryTaskRecord,
} from "@/lib/history";
import { formatUiText, getUiText } from "@/lib/ui-text";
import { deleteHistoryTasks } from "@/services/api";
import AppToast from "./ui/AppToast";
import ConfirmDialog from "./ui/ConfirmDialog";

type DeleteScope =
  | { scope: "single"; taskId: string }
  | { scope: "selected" }
  | null;

export default function HistoryWorkspace({
  initialTasks,
  q,
  statusFilter,
  uiLanguage,
}: {
  initialTasks: HistoryTaskRecord[];
  q: string;
  statusFilter: HistoryStatusFilter;
  uiLanguage: UiLanguage;
}) {
  const text = getUiText(uiLanguage).history as ReturnType<typeof getUiText>["history"] & {
    actions: string;
    selectAll: string;
    selectedCount: string;
    delete: string;
    deleteTask: string;
    deleteSelected: string;
    deleteTaskConfirm: string;
    deleteSelectedConfirm: string;
    deleteFailed: string;
    deleteSuccess: string;
    deleting: string;
    confirmDelete: string;
    cancel: string;
  };
  const [tasks, setTasks] = useState(initialTasks);
  const initialSelectedIds =
    statusFilter === "all"
      ? []
      : filterHistoryItems(buildHistoryItems(initialTasks), statusFilter).map(
          (item) => item.id
        );
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [deleteScope, setDeleteScope] = useState<DeleteScope>(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "error">("success");

  const allItems = buildHistoryItems(tasks);
  const items = filterHistoryItems(allItems, statusFilter);
  const summary = summarizeHistory(tasks);
  const selectedIdSet = new Set(selectedIds);
  const allVisibleSelected =
    items.length > 0 && items.every((item) => selectedIdSet.has(item.id));
  const selectedCount = selectedIds.length;

  const filterOptions = [
    { value: "all" as const, label: text.all },
    { value: "completed" as const, label: text.completed },
    { value: "in-progress" as const, label: text.inProgress },
    { value: "issues" as const, label: `${text.issues} (${summary.issueTasks})` },
  ];

  function toggleSelection(taskId: string) {
    setSelectedIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId]
    );
  }

  function toggleAllVisible() {
    const visibleIds = items.map((item) => item.id);
    setSelectedIds((current) => {
      if (visibleIds.every((id) => current.includes(id))) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  async function handleConfirmDelete() {
    if (!deleteScope) {
      return;
    }

    setDeleting(true);

    try {
      let fallbackDeletedIds: string[] = [];
      const response =
        deleteScope.scope === "single"
          ? await deleteHistoryTasks({ taskId: deleteScope.taskId })
          : await deleteHistoryTasks({ taskIds: selectedIds });

      if (deleteScope.scope === "single") {
        fallbackDeletedIds = [deleteScope.taskId];
      } else {
        fallbackDeletedIds = selectedIds;
      }

      if (response.error) {
        throw new Error(response.error);
      }

      const deletedIds = response.deletedIds ?? response.taskIds ?? fallbackDeletedIds;
      setTasks((current) => current.filter((task) => !deletedIds.includes(task.id)));
      setSelectedIds((current) => current.filter((id) => !deletedIds.includes(id)));
      setDeleteScope(null);
      setToastTone("success");
      setToastMessage(
        formatUiText(text.deleteSuccess, { count: deletedIds.length })
      );
    } catch (error: unknown) {
      setToastTone("error");
      setToastMessage(error instanceof Error ? error.message : text.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  const dialogTitle =
    deleteScope?.scope === "single"
      ? text.deleteTask
      : text.deleteSelected;
  const dialogDescription =
    deleteScope?.scope === "single"
      ? formatUiText(text.deleteTaskConfirm, {
          id: deleteScope.taskId.slice(0, 8),
        })
      : formatUiText(text.deleteSelectedConfirm, { count: selectedCount });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <AppToast
        message={toastMessage}
        tone={toastTone}
        onClose={() => setToastMessage(null)}
      />
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <span className="rounded-full bg-[var(--secondary-container)] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[var(--on-surface-variant)]">
            {items.length} {text.visibleTasks}
          </span>
          <div>
            <h2 className="font-headline text-4xl font-extrabold tracking-tight text-[var(--on-surface)]">
              {text.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--on-surface-variant)] lg:text-base">
              {text.description}
            </p>
          </div>
        </div>

        <form action="/history" className="flex w-full max-w-md gap-3">
          {statusFilter !== "all" ? (
            <input type="hidden" name="status" value={statusFilter} />
          ) : null}
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={text.search}
            className="w-full rounded-xl bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-[var(--on-surface)] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] transition placeholder:text-[color:color-mix(in_srgb,var(--on-surface-variant)_75%,transparent)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--primary)_20%,transparent)]"
          />
          <button
            type="submit"
            className="rounded-xl bg-[var(--surface-container-lowest)] px-4 py-3 text-sm font-bold text-[var(--primary)] shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--primary)_20%,transparent)] transition hover:bg-[var(--surface-container-high)]"
          >
            {text.searchButton}
          </button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.25rem] bg-[var(--surface-container-lowest)] p-6 shadow-[0_24px_48px_rgba(17,28,45,0.06)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]">
          <p className="text-[11px] font-extrabold tracking-[0.22em] text-[var(--on-surface-variant)] uppercase">
            {text.totalTasks}
          </p>
          <p className="font-headline mt-2 text-3xl font-extrabold text-[var(--on-surface)]">
            {summary.totalTasks}
          </p>
        </div>
        <div className="rounded-[1.25rem] bg-[var(--surface-container-lowest)] p-6 shadow-[0_24px_48px_rgba(17,28,45,0.06)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]">
          <p className="text-[11px] font-extrabold tracking-[0.22em] text-[var(--on-surface-variant)] uppercase">
            {text.completed}
          </p>
          <p className="font-headline mt-2 text-3xl font-extrabold text-[var(--on-surface)]">
            {summary.completedTasks}
          </p>
        </div>
        <div className="rounded-[1.25rem] bg-[var(--surface-container-lowest)] p-6 shadow-[0_24px_48px_rgba(17,28,45,0.06)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]">
          <p className="text-[11px] font-extrabold tracking-[0.22em] text-[var(--on-surface-variant)] uppercase">
            {text.successRate}
          </p>
          <p className="font-headline mt-2 text-3xl font-extrabold text-[var(--on-surface)]">
            {summary.successRate}%
          </p>
        </div>
      </section>

      <section className="rounded-[1.25rem] bg-[var(--surface-container-lowest)] p-4 shadow-[0_24px_48px_rgba(17,28,45,0.06)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {filterOptions.map((filter) => {
              const active = statusFilter === filter.value;
              return (
                <Link
                  key={filter.value}
                  href={buildHistoryFilterHref(filter.value, q)}
                  className={
                    active
                      ? "rounded-full bg-[#003ec7] px-4 py-2 text-[11px] font-extrabold tracking-[0.18em] text-white uppercase"
                      : "rounded-full bg-[var(--secondary-container)] px-4 py-2 text-[11px] font-extrabold tracking-[0.18em] text-[var(--on-surface-variant)] uppercase transition hover:bg-[var(--surface-container-high)]"
                  }
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--surface-container-low)] px-3 py-1 text-[10px] font-extrabold tracking-[0.14em] text-[var(--on-surface-variant)]">
              {formatUiText(text.selectedCount, { count: selectedCount })}
            </span>
            <button
              type="button"
              onClick={() => setDeleteScope({ scope: "selected" })}
              disabled={selectedCount === 0}
              className="rounded-full bg-[var(--surface-container-low)] px-3 py-1.5 text-[10px] font-extrabold tracking-[0.14em] text-[var(--error)] ring-1 ring-[color:color-mix(in_srgb,var(--error)_18%,transparent)] transition hover:bg-[var(--error-container)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {text.deleteSelected}
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[color:color-mix(in_srgb,var(--surface-container-low)_70%,transparent)] text-[var(--on-surface-variant)]">
                <th className="px-4 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                  <input
                    type="checkbox"
                    aria-label={text.selectAll}
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    className="h-4 w-4 rounded border-[var(--outline-variant)] text-[var(--primary)]"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                  {text.task}
                </th>
                <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                  {text.targetLanguage}
                </th>
                <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                  {text.engine}
                </th>
                <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                  {text.created}
                </th>
                <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                  {text.progress}
                </th>
                <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                  {text.status}
                </th>
                <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                  {text.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]">
              {items.map((task) => (
                <tr
                  key={task.id}
                  className="transition hover:bg-[color:color-mix(in_srgb,var(--surface-container-low)_35%,transparent)]"
                >
                  <td className="px-4 py-5">
                    <input
                      type="checkbox"
                      aria-label={`${text.task} ${task.id.slice(0, 8)}`}
                      checked={selectedIdSet.has(task.id)}
                      onChange={() => toggleSelection(task.id)}
                      className="h-4 w-4 rounded border-[var(--outline-variant)] text-[var(--primary)]"
                    />
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <Link
                        href={`/history/${task.id}`}
                        className="font-semibold text-[var(--primary)] transition hover:underline"
                      >
                        {text.task} {task.id.slice(0, 8)}
                      </Link>
                      <p className="text-xs text-[var(--on-surface-variant)]">{task.id}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="rounded-lg bg-[var(--secondary-container)] px-2 py-1 text-[10px] font-black tracking-[0.18em] text-[var(--primary)] uppercase">
                      {task.target_lang}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-[var(--on-surface-variant)]">
                    {task.engine}
                  </td>
                  <td className="px-6 py-5 text-sm text-[var(--on-surface-variant)]">
                    {formatHistoryDate(task.created_at)}
                  </td>
                  <td className="px-6 py-5 text-sm text-[var(--on-surface-variant)]">
                    {task.completedCount} done / {task.failedCount} failed
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={
                        task.displayStatus === "completed"
                          ? "whitespace-nowrap rounded-full bg-[var(--secondary-container)] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[var(--primary)] uppercase"
                          : task.displayStatus === "issues"
                            ? "whitespace-nowrap rounded-full bg-[var(--error-container)] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[var(--error)] uppercase"
                            : "whitespace-nowrap rounded-full bg-[var(--surface-container-low)] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[var(--on-surface-variant)] uppercase"
                      }
                    >
                      {task.displayStatus === "in-progress"
                        ? text.inProgress
                        : task.displayStatus === "issues"
                          ? text.issues
                          : text.completed}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <button
                      type="button"
                      onClick={() => setDeleteScope({ scope: "single", taskId: task.id })}
                      aria-label={text.delete}
                      title={text.delete}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-container-low)] text-[var(--error)] ring-1 ring-[color:color-mix(in_srgb,var(--error)_18%,transparent)] transition hover:bg-[var(--error-container)]"
                    >
                      <DeleteIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-[var(--surface-container-low)] px-6 py-10 text-center">
            <p className="font-headline text-xl font-extrabold text-[var(--on-surface)]">
              {text.noResultsTitle}
            </p>
            <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
              {text.noResultsDescription}
            </p>
          </div>
        ) : null}
      </section>

      <ConfirmDialog
        open={deleteScope !== null}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel={deleting ? text.deleting : text.confirmDelete}
        cancelLabel={text.cancel}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) {
            setDeleteScope(null);
          }
        }}
        loading={deleting}
        tone="danger"
      />
    </div>
  );
}
