"use client"

import type { ReactNode } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"

export function ModuleWorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <ScrollArea
        className="h-full max-w-full min-w-0"
        viewportClassName="[&>div]:!block [&>div]:!min-w-0 [&>div]:!max-w-full"
      >
        <div className="w-full max-w-full min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </ScrollArea>
    </div>
  )
}
