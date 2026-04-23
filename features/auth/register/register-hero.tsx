export function RegisterHero({ apiUrl }: { apiUrl: string }) {
  return (
    <section className="flex flex-col justify-center gap-6">
      <div className="inline-flex w-fit items-center rounded-full border border-slate-200/70 bg-white/70 px-4 py-1 text-xs font-medium tracking-wide text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
        Code Crafter X
      </div>
      <div className="space-y-4">
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Create your account.
        </h1>
        <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Registration uses{" "}
          <span className="font-mono text-sm text-slate-900 dark:text-slate-100">
            {apiUrl}
          </span>
          .
        </p>
      </div>
      <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="font-medium text-slate-900 dark:text-slate-100">POST</div>
          <div className="font-mono text-xs">/api/v1/auth/register</div>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="font-medium text-slate-900 dark:text-slate-100">Body</div>
          <div className="font-mono text-xs">profile fields</div>
        </div>
      </div>
    </section>
  )
}

