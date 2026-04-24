import Link from "next/link"

import { Button } from "@/components/ui/button"
import { EntryTopNav } from "@/components/entry-top-nav"

export default function Page() {
  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_28%),linear-gradient(180deg,_#eff6ff_0%,_#f8fafc_48%,_#ffffff_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#111827_48%,_#020617_100%)] dark:text-slate-100">
      <EntryTopNav current="account" />

      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-3 pt-16 sm:px-4 sm:pt-16">
        <section className="flex flex-1 items-center py-5 sm:py-6">
          <div className="w-full rounded-3xl border border-white/60 bg-white/80 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-10">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Account
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Account details
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              This is the account area. You can add account settings and billing
              controls here next.
            </p>

            <div className="mt-8">
              <Button asChild className="h-11 rounded-xl px-6 text-sm font-medium">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
