import { type ReactNode } from "react"

import { MerchandisingWorkspace } from "@/app/merchandising/merchandising-workspace"
import { ModuleShell } from "@/components/module-shell"

export default function MerchandisingLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <ModuleShell
      current="merchandising"
      mainClassName="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(180deg,_#f0fdf4_0%,_#f8fafc_48%,_#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.22),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#111827_48%,_#020617_100%)]"
    >
      <MerchandisingWorkspace>{children}</MerchandisingWorkspace>
    </ModuleShell>
  )
}
