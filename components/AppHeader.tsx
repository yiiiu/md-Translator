"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp as HelpIcon } from "lucide-react";
import type { UiLanguage } from "@/lib/app-settings";
import { getUiText } from "@/lib/ui-text";
import { useTranslationStore } from "@/stores/translation";

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
  const storeUiLanguage = useTranslationStore((state) => state.uiLanguage);
  const appSettingsHydrated = useTranslationStore((state) => state.appSettingsHydrated);
  const resolvedUiLanguage = appSettingsHydrated ? storeUiLanguage : uiLanguage;
  const text = getUiText(resolvedUiLanguage);

  return (
    <header className="z-20 bg-[#f9f9ff]">
      <div className="flex h-14 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-6">
          <h1 className="font-headline text-lg font-extrabold tracking-tight text-[#0052ff]">
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
                      ? "relative flex flex-col items-center rounded-lg bg-[#ebf1ff] px-4 py-2 font-headline font-bold tracking-tight text-[#0052ff]"
                      : "rounded-lg px-4 py-2 font-headline font-bold tracking-tight text-[#434656] transition hover:bg-[#f0f3ff] hover:text-[#003ec7]"
                  }
                >
                  {text.header[item.labelKey]}
                  {active ? (
                    <span className="absolute bottom-0 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-[#0052ff]" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="grid h-9 w-10 place-items-center rounded-xl text-[#434656] transition hover:bg-[#f0f3ff] hover:text-[#003ec7]"
            aria-label={text.header.help}
            title={text.header.help}
          >
            <HelpIcon className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#111c2d] text-xs font-bold text-white">
            L
          </div>
        </div>
      </div>
    </header>
  );
}
