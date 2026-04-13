"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleHelp as HelpIcon,
  Settings as SettingsIcon,
} from "lucide-react";

type AppHeaderProps = {
  onOpenSettings?: () => void;
};

const NAV_ITEMS = [
  {
    href: "/",
    label: "Projects",
    isActive: (pathname: string) => pathname === "/",
  },
  {
    href: "/glossary",
    label: "Glossary",
    isActive: (pathname: string) => pathname.startsWith("/glossary"),
  },
  {
    href: "/history",
    label: "History",
    isActive: (pathname: string) => pathname.startsWith("/history"),
  },
];

export default function AppHeader({ onOpenSettings }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="z-20 bg-[#f9f9ff]">
      <div className="flex h-14 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-6">
          <h1 className="font-headline text-lg font-extrabold tracking-tight text-[#0052ff]">
            Lucid Editor
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
                  {item.label}
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
            aria-label="Help"
            title="Help"
          >
            <HelpIcon className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="grid h-9 w-10 place-items-center rounded-xl text-[#434656] transition hover:bg-[#f0f3ff] hover:text-[#003ec7]"
            aria-label="Settings"
            title="Settings"
          >
            <SettingsIcon className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#111c2d] text-xs font-bold text-white">
            L
          </div>
        </div>
      </div>
    </header>
  );
}
