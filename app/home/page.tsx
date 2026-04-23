import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_28%),linear-gradient(180deg,_#eff6ff_0%,_#f8fafc_48%,_#ffffff_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#111827_48%,_#020617_100%)] dark:text-slate-100">
      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="sticky top-4 z-20 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-[0_16px_50px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75 dark:shadow-[0_16px_50px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                CX
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Code Crafter X
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Workspace home
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2">
              <Link
                href="/home"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
              >
                Home
              </Link>
              <Link
                href="/register"
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
              >
                Register
              </Link>
              <Link
                href="/"
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
              >
                Sign out
              </Link>
            </nav>
          </div>
        </header>

        <section className="flex flex-1 items-center py-8 sm:py-10">
          <div className="w-full rounded-3xl border border-white/60 bg-white/80 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-10">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Home
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Your session is active. You can build the main dashboard here next.
            </p>

            <div className="mt-8">
              <Button asChild className="h-11 rounded-xl px-6 text-sm font-medium">
                <Link href="/">Back to login</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
