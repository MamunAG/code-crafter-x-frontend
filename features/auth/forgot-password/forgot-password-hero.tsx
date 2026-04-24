export function ForgotPasswordHero({ apiUrl }: { apiUrl: string }) {
  return (
    <section className="flex flex-col justify-center gap-6">
      <div className="inline-flex w-fit items-center rounded-full border border-slate-200/70 bg-white/70 px-4 py-1 text-xs font-medium tracking-wide text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
        Account recovery
      </div>
      <div className="space-y-4">
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Reset your password with a clean, guided flow.
        </h1>
        <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
          We will send a 4-digit verification code to your email or recovery
          email, then let you set a new password once the code is confirmed.
          The recovery flow uses the NestJS auth API at{" "}
          <span className="font-mono text-sm text-slate-900 dark:text-slate-100">
            {apiUrl}
          </span>
          .
        </p>
      </div>
      <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="font-medium text-slate-900 dark:text-slate-100">Step 1</div>
          <div className="font-mono text-xs">email address</div>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="font-medium text-slate-900 dark:text-slate-100">Step 2</div>
          <div className="font-mono text-xs">4-digit code</div>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="font-medium text-slate-900 dark:text-slate-100">Step 3</div>
          <div className="font-mono text-xs">new password</div>
        </div>
      </div>
    </section>
  )
}
