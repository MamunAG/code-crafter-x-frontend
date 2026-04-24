import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ModuleNavMenu } from "@/components/module-nav-menu"

type ModuleRoutePageProps = {
  current: "app-config" | "merchandising" | "iam"
  title: string
  eyebrow: string
  description: string
  pathLabel: string
  showModuleNavigation?: boolean
}

export function ModuleRoutePage({
  current,
  title,
  eyebrow,
  description,
  pathLabel,
  showModuleNavigation = true,
}: ModuleRoutePageProps) {
  return (
    <div className="flex min-h-full w-full flex-col">
      {showModuleNavigation ? (
        <div className="pb-4 pt-4">
          <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Module navigation
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Open a module to see its submenus and nested items.
                </p>
              </div>
              <div className="ml-auto">
                <ModuleNavMenu current={current} variant="subnav" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

        <section className="flex flex-1 items-center py-5 sm:py-6">
          <div className="w-full rounded-3xl border border-white/60 bg-white/80 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-10">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              {description}
            </p>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Route: <span className="font-medium text-slate-700 dark:text-slate-200">{pathLabel}</span>
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="h-11 rounded-xl px-6 text-sm font-medium">
                <Link href={`/${current}`}>Back to module overview</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl px-6 text-sm font-medium">
                <Link href="/account">Account</Link>
              </Button>
            </div>
          </div>
        </section>
    </div>
  )
}
