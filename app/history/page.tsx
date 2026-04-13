import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { listTasks } from "@/lib/db";

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
    <main className="flex h-screen flex-col overflow-hidden bg-[#f9f9ff] text-[#111c2d]">
      <AppHeader />
      <div className="flex-1 overflow-y-auto bg-[#f0f3ff] px-4 py-4 lg:px-8 lg:py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="rounded-full bg-[#d5e3fc] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[#57657a]">
                {items.length} visible tasks
              </span>
              <div>
                <h2 className="font-headline text-4xl font-extrabold tracking-tight text-[#111c2d]">
                  Translation History
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-[#434656] lg:text-base">
                  Monitor real translation runs stored in the local task history and
                  inspect engine, language, timing, and processing outcomes.
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
                placeholder="Search by task id, engine, or language..."
                className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-[#c3c5d9]/25 transition focus:ring-2 focus:ring-[#0052ff]/20"
              />
              <button
                type="submit"
                className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#003ec7] shadow-sm ring-1 ring-[#003ec7]/20 transition hover:bg-[#dee8ff]"
              >
                Search
              </button>
            </form>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.25rem] bg-white p-6 shadow-[0_24px_48px_rgba(17,28,45,0.06)]">
              <p className="text-[11px] font-extrabold tracking-[0.22em] text-[#737688] uppercase">
                Total Tasks
              </p>
              <p className="font-headline mt-2 text-3xl font-extrabold text-[#111c2d]">
                {totalTasks}
              </p>
            </div>
            <div className="rounded-[1.25rem] bg-white p-6 shadow-[0_24px_48px_rgba(17,28,45,0.06)]">
              <p className="text-[11px] font-extrabold tracking-[0.22em] text-[#737688] uppercase">
                Completed
              </p>
              <p className="font-headline mt-2 text-3xl font-extrabold text-[#111c2d]">
                {completedTasks}
              </p>
            </div>
            <div className="rounded-[1.25rem] bg-white p-6 shadow-[0_24px_48px_rgba(17,28,45,0.06)]">
              <p className="text-[11px] font-extrabold tracking-[0.22em] text-[#737688] uppercase">
                Success Rate
              </p>
              <p className="font-headline mt-2 text-3xl font-extrabold text-[#111c2d]">
                {successRate}%
              </p>
            </div>
          </section>

          <section className="rounded-[1.25rem] bg-white p-4 shadow-[0_24px_48px_rgba(17,28,45,0.06)]">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: "all", label: "All" },
                { value: "completed", label: "Completed" },
                { value: "in-progress", label: "In Progress" },
                { value: "issues", label: `Issues (${issueTasks})` },
              ].map((filter) => {
                const active = statusFilter === filter.value;
                return (
                  <Link
                    key={filter.value}
                    href={buildFilterHref(filter.value, q)}
                    className={
                      active
                        ? "rounded-full bg-[#003ec7] px-4 py-2 text-[11px] font-extrabold tracking-[0.18em] text-white uppercase"
                        : "rounded-full bg-[#d5e3fc] px-4 py-2 text-[11px] font-extrabold tracking-[0.18em] text-[#57657a] uppercase transition hover:bg-[#dee8ff]"
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
                  <tr className="bg-[#f0f3ff]/70 text-[#434656]">
                    <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                      Task
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                      Target Language
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                      Engine
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                      Created
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                      Progress
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-[0.18em] uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c3c5d9]/15">
                  {items.map((task) => (
                    <tr key={task.id} className="transition hover:bg-[#f0f3ff]/35">
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="font-semibold text-[#111c2d]">
                            Task {task.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-[#737688]">{task.id}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="rounded-lg bg-[#d5e3fc] px-2 py-1 text-[10px] font-black tracking-[0.18em] text-[#003ec7] uppercase">
                          {task.target_lang}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-[#434656]">{task.engine}</td>
                      <td className="px-6 py-5 text-sm text-[#57657a]">
                        {formatDate(task.created_at)}
                      </td>
                      <td className="px-6 py-5 text-sm text-[#57657a]">
                        {task.completedCount} done / {task.failedCount} failed
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={
                            task.displayStatus === "completed"
                              ? "rounded-full bg-[#d5e3fc] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[#003ec7] uppercase"
                              : task.displayStatus === "issues"
                                ? "rounded-full bg-[#ffdad6] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[#93000a] uppercase"
                                : "rounded-full bg-[#f0f3ff] px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[#737688] uppercase"
                          }
                        >
                          {task.displayStatus === "in-progress"
                            ? "In Progress"
                            : task.displayStatus === "issues"
                              ? "Issues"
                              : "Completed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {items.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-[#f0f3ff] px-6 py-10 text-center">
                <p className="font-headline text-xl font-extrabold text-[#111c2d]">
                  No history results found
                </p>
                <p className="mt-2 text-sm text-[#57657a]">
                  Adjust the current search or status filter to inspect other tasks.
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
