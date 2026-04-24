import Link from "next/link"

import { Button } from "@/components/ui/button"

type ModuleLandingPageProps = {
  eyebrow: string
  title: string
  description: string
  actionHref: string
  actionLabel: string
}

export function ModuleLandingPage({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: ModuleLandingPageProps) {
  return (
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

        <div className="mt-8">
          <Button asChild className="h-11 rounded-xl px-6 text-sm font-medium">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
