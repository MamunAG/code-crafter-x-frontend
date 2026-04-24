import { type ReactNode } from "react"

import { ModuleShell } from "@/components/module-shell"

export default function IamLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <ModuleShell
      current="iam"
      mainClassName="bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(180deg,_#eef2ff_0%,_#f8fafc_48%,_#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.22),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#111827_48%,_#020617_100%)]"
    >
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-3 sm:px-4">
        {children}
      </div>
    </ModuleShell>
  )
}
