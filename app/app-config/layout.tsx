import { type ReactNode } from "react"

import { ModuleShell } from "@/components/module-shell"

export default function AppConfigLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <ModuleShell
      current="app-config"
      mainClassName="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_28%),linear-gradient(180deg,_#eff6ff_0%,_#f8fafc_48%,_#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#111827_48%,_#020617_100%)]"
    >
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-3 sm:px-4">
        {children}
      </div>
    </ModuleShell>
  )
}
