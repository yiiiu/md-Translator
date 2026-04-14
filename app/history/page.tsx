import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { getAppSettings, listTasks } from "@/lib/db";
import { getUiText } from "@/lib/ui-text";

function normalizeStatusFilter(value: string | undefined) {
  if (value && ["all", "completed", "in-progress", "issues"].includes(value)) {
    return value;
  }

  return "all";
}

function normalizeQuery(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function parseCompletedIds(value: string) {
  try {
    const parsed = JSON.parse(value) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseFailedIds(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function deriveDisplayStatus(task: ReturnType<typeof listTasks>[number]) {
  const failedCount = Object.keys(parseFailedIds(task.failed_ids)).length;

  if (failedCount > 0) {
    return "issues";
  }

  if (task.status === "completed") {
    return "completed";
  }

  return "in-progress";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildFilterHref(status: string, q: string) {
  const search = new URLSearchParams();
  if (status !== "all") {
    search.set("status", status);
  }
  if (q) {
    search.set("q", q);
  }

  const query = search.toString();
  return `/history${query ? `?${query}` : ""}`;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const settings = getAppSettings();
  const text = getUiText(settings.ui_language).history;
  const q = normalizeQuery(params.q);
  const statusFilter = normalizeStatusFilter(params.status);
  const tasks = listTasks({ q });

  const items = tasks
    .map((task) => {
      const completedCount = parseCompletedIds(task.completed_ids).length;
      const failedCount = Object.keys(parseFailedIds(task.failed_ids)).length;

      return {
        ...task,
        completedCount,
        failedCount,
        displayStatus: deriveDisplayStatus(task),
      };
    })
    .filter((task) => statusFilter === "all" || task.displayStatus === statusFilter);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => deriveDisplayStatus(task) === "completed").length;
  const issueTasks = tasks.filter((task) => deriveDisplayStatus(task) === "issues").length;
  const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[var(--background)] text-[var(--on-surface)]">
      <AppHeader uiLanguage={settings.ui_language} />
      <div className="flex-1 overflow-y-auto bg-[var(--surface-container-low)] px-4 py-4 lg:px-8 lg:py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
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
                {totalTasks}
              </p>
            </div>
            <div className="rounded-[1.25rem] bg-[var(--surface-container-lowest)] p-6 shadow-[0_24px_48px_rgba(17,28,45,0.06)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]">
              <p className="text-[11px] font-extrabold tracking-[0.22em] text-[var(--on-surface-variant)] uppercase">
                {text.completed}
              </p>
              <p className="font-headline mt-2 text-3xl font-extrabold text-[var(--on-surface)]">
                {completedTasks}
              </p>
            </div>
            <div className="rounded-[1.25rem] bg-[var(--surface-container-lowest)] p-6 shadow-[0_24px_48px_rgba(17,28,45,0.06)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]">
              <p className="text-[11px] font-extrabold tracking-[0.22em] text-[var(--on-surface-variant)] uppercase">
                {text.successRate}
              </p>
              <p className="font-headline mt-2 text-3xl font-extrabold text-[var(--on-surface)]">
                {successRate}%
              </p>
            </div>
          </section>

          <section className="rounded-[1.25rem] bg-[var(--surface-container-lowest)] p-4 shadow-[0_24px_48px_rgba(17,28,45,0.06)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: "all", label: text.all },
                { value: "completed", label: text.completed },
                { value: "in-progress", label: text.inProgress },
                { value: "issues", label: `${text.issues} (${issueTasks})` },
              ].map((filter) => {
                const active = statusFilter === filter.value;
                return (
                  <Link
                    key={filter.value}
                    href={buildFilterHref(filter.value, q)}
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

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[color:color-mix(in_srgb,var(--surface-container-low)_70%,transparent)] text-[var(--on-surface-variant)]">
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
                </tr>
              </thead>
                <tbody className="divide-y divide-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)]">
                  {items.map((task) => (
                    <tr key={task.id} className="transition hover:bg-[color:color-mix(in_srgb,var(--surface-container-low)_35%,transparent)]">
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
                      <td className="px-6 py-5 text-sm text-[var(--on-surface-variant)]">{task.engine}</td>
                      <td className="px-6 py-5 text-sm text-[var(--on-surface-variant)]">
                        {formatDate(task.created_at)}
                      </td>
                      <td className="px-6 py-5 text-sm text-[var(--on-surface-variant)]">
                        {task.completedCount} done / {task.failedCount} failed
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={
                            task.displayStatus === "completed"
                              ? "rounded-full bg-[var(--secondary-container)] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[var(--primary)] uppercase"
                              : task.displayStatus === "issues"
                                ? "rounded-full bg-[var(--error-container)] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[var(--error)] uppercase"
                                : "rounded-full bg-[var(--surface-container-low)] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[var(--on-surface-variant)] uppercase"
                          }
                        >
                          {task.displayStatus === "in-progress"
                            ? text.inProgress
                            : task.displayStatus === "issues"
                              ? text.issues
                              : text.completed}
                        </span>
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
        </div>
      </div>
    </main>
  );
}
