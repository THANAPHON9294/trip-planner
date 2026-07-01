"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "./AccountMenu";

const TABS = [
  { key: "board", label: "Board", icon: "🗂️" },
  { key: "map", label: "Map", icon: "🗺️" },
  { key: "plan", label: "Plan", icon: "📅" },
];

export function TripNav({ slug, tripName }: { slug: string; tripName: string }) {
  const pathname = usePathname();
  const active = TABS.find((t) => pathname?.endsWith(`/${t.key}`))?.key ?? "board";

  return (
    <>
      {/* Top bar (desktop) */}
      <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/" className="text-sm font-medium text-ink-soft hover:text-ink">
            ← Trips
          </Link>
          <h1 className="flex-1 truncate font-heading text-lg font-semibold">{tripName}</h1>
          <nav className="hidden gap-1 sm:flex">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={`/trip/${slug}/${t.key}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active === t.key ? "bg-river text-white" : "text-ink-soft hover:bg-black/5"
                }`}
              >
                {t.label}
              </Link>
            ))}
            <Link
              href={`/trip/${slug}/setup`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-black/5"
            >
              ⚙︎
            </Link>
          </nav>
          <AccountMenu />
        </div>
      </header>

      {/* Bottom bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-stretch">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/trip/${slug}/${t.key}`}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                active === t.key ? "text-river" : "text-ink-soft"
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              {t.label}
            </Link>
          ))}
          <Link
            href={`/trip/${slug}/setup`}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium text-ink-soft"
          >
            <span className="text-lg">⚙︎</span>
            Setup
          </Link>
        </div>
      </nav>
    </>
  );
}
