import { type ReactNode } from "react"

import { EntryTopNav } from "@/components/entry-top-nav"
import { MerchandisingWorkspace } from "@/app/merchandising/merchandising-workspace"

export default function MerchandisingLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <main className="flex h-svh flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(180deg,_#f0fdf4_0%,_#f8fafc_48%,_#ffffff_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.22),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#111827_48%,_#020617_100%)] dark:text-slate-100">
      <EntryTopNav current="merchandising" />
      <div className="min-h-0 flex-1 pt-8">
        <MerchandisingWorkspace>{children}</MerchandisingWorkspace>
      </div>
    </main>
  )
}
