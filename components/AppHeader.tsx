"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp as HelpIcon } from "lucide-react";
import type { UiLanguage } from "@/lib/app-settings";
import { getUiText } from "@/lib/ui-text";
import { useAppSettingsStore } from "@/stores/app-settings";

const NAV_ITEMS = [
  {
    href: "/",
    labelKey: "projects",
    isActive: (pathname: string) => pathname === "/",
  },
  {
    href: "/history",
    labelKey: "history",
    isActive: (pathname: string) => pathname.startsWith("/history"),
  },
  {
    href: "/settings",
    labelKey: "settings",
    isActive: (pathname: string) => pathname.startsWith("/settings"),
  },
] as const;

export default function AppHeader({
  uiLanguage = "en",
}: {
  uiLanguage?: UiLanguage;
}) {
  const pathname = usePathname();
  const storeUiLanguage = useAppSettingsStore((state) => state.uiLanguage);
  const appSettingsHydrated = useAppSettingsStore((state) => state.appSettingsHydrated);
  const resolvedUiLanguage = appSettingsHydrated ? storeUiLanguage : uiLanguage;
  const text = getUiText(resolvedUiLanguage);

  return (
    <header className="z-20 border-b border-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)] bg-[var(--background)]">
      <div className="flex h-14 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-6">
          <h1 className="font-headline text-lg font-extrabold tracking-tight text-[var(--primary-container)]">
            {text.appName}
          </h1>
          <nav className="hidden items-center gap-2 text-xs md:flex">
            {NAV_ITEMS.map((item) => {
              const active = item.isActive(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "relative flex flex-col items-center rounded-lg bg-[var(--surface-container)] px-4 py-2 font-headline font-bold tracking-tight text-[var(--primary)]"
                      : "rounded-lg px-4 py-2 font-headline font-bold tracking-tight text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container-low)] hover:text-[var(--primary)]"
                  }
                >
                  {text.header[item.labelKey]}
                  {active ? (
                    <span className="absolute bottom-0 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-[var(--primary-container)]" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="grid h-9 w-10 place-items-center rounded-xl text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container-low)] hover:text-[var(--primary)]"
            aria-label={text.header.help}
            title={text.header.help}
          >
            <HelpIcon className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--on-surface)] text-xs font-bold text-[var(--surface-container-lowest)]">
            L
          </div>
        </div>
      </div>
    </header>
  );
}
