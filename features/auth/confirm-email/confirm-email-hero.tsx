import { MailCheck, ShieldCheck, RotateCcw } from "lucide-react"

export function ConfirmEmailHero() {
  return (
    <aside className="relative overflow-hidden rounded-3xl border border-white/60 bg-slate-950/95 p-8 text-white shadow-[0_30px_100px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-slate-950/90">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-300">
          Account verification
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Confirm your email and unlock sign in.
        </h1>
        <p className="max-w-xl text-base leading-7 text-slate-300">
          We send a 4-digit code to your email address. Use it here to verify
          the account, request a fresh code if needed, and continue to the app.
        </p>
      </div>

      <div className="mt-8 grid gap-3">
        {[
          {
            icon: MailCheck,
            title: "Receive the code",
            description: "We send a branded verification email automatically after signup.",
          },
          {
            icon: ShieldCheck,
            title: "Enter the code",
            description: "Use the code on this page to mark the account as verified.",
          },
          {
            icon: RotateCcw,
            title: "Resend if needed",
            description: "Request a new verification mail whenever the old one expires.",
          },
        ].map((item) => {
          const Icon = item.icon

          return (
            <div
              key={item.title}
              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {item.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
