import { ConfirmEmailForm } from "./confirm-email-form"
import { ConfirmEmailHero } from "./confirm-email-hero"

export function ConfirmEmailPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_28%),linear-gradient(180deg,_#eff6ff_0%,_#f8fafc_48%,_#ffffff_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#111827_48%,_#020617_100%)] dark:text-slate-100">
      <div className="mx-auto flex min-h-svh w-full max-w-6xl items-center px-6 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.06fr_0.94fr]">
          <ConfirmEmailHero />
          <ConfirmEmailForm apiUrl={apiUrl} />
        </div>
      </div>
    </main>
  )
}
