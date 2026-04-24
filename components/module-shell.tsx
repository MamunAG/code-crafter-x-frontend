import { type ReactNode } from "react"

import { EntryTopNav } from "@/components/entry-top-nav"
import { cn } from "@/lib/utils"

type ModuleShellProps = {
  current: "app-config" | "merchandising" | "iam"
  children: ReactNode
  mainClassName: string
}

export function ModuleShell({
  current,
  children,
  mainClassName,
}: ModuleShellProps) {
  return (
    <main
      className={cn(
        "flex h-svh flex-col overflow-hidden text-slate-900 dark:text-slate-100",
        mainClassName,
      )}
    >
      <EntryTopNav current={current} />
      <div className="min-h-0 flex-1 pt-16 lg:pt-8">{children}</div>
    </main>
  )
}
