"use client"

import type { ReactNode } from "react"

import AppAddNewButton from "@/components/app-add-new-button"
import AppRefreshButton from "@/components/app-refresh-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export function HrPageHeader({
  eyebrow = "HR & Payroll",
  title,
  description,
  badges = [],
  onRefresh,
  onCreate,
  createLabel,
  actions,
}: {
  eyebrow?: string
  title: string
  description: string
  badges?: Array<{ label: ReactNode; variant?: "default" | "secondary" | "destructive" | "outline" }>
  onRefresh?: () => void
  onCreate?: () => void
  createLabel?: string
  actions?: ReactNode
}) {
  return (
    <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
      <CardContent className="p-4 sm:p-8 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
            {badges.length ? <div className="mt-4 flex flex-wrap gap-2">{badges.map((badge, index) => <Badge key={index} variant={badge.variant ?? "outline"} className="rounded-full px-3 py-1">{badge.label}</Badge>)}</div> : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {onRefresh ? <AppRefreshButton triggerRefresh={onRefresh} title="Refresh" /> : null}
            {actions}
            {onCreate ? <AppAddNewButton openCreateDialog={onCreate} title={createLabel ?? "New record"} /> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

