import Link from "next/link"

import { cn } from "@/lib/utils"

type EntryTopNavProps = {
  current: "home" | "register" | "sign-in"
}

const NAV_ITEMS = [
  { href: "/", label: "Home", key: "home" as const },
  { href: "/register", label: "Register", key: "register" as const },
  { href: "/sign-in", label: "Sign in", key: "sign-in" as const },
]

export function EntryTopNav({ current }: EntryTopNavProps) {
  return (
    <header className="sticky top-2 z-20 rounded-2xl border border-white/70 bg-white/80 px-3 py-2 shadow-[0_12px_32px_rgba(15,23,42,0.10)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75 dark:shadow-[0_12px_32px_rgba(0,0,0,0.24)] sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
            CX
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Code Crafter X
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Workspace
            </p>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === current

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
