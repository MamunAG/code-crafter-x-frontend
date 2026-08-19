"use client"

import type { ReactNode } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"

export function HrWorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">{children}</div>
      </ScrollArea>
    </div>
  )
}
