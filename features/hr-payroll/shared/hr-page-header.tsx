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
  badges?: Array<{
    label: ReactNode
    variant?: "default" | "secondary" | "destructive" | "outline"
  }>
  onRefresh?: () => void
  onCreate?: () => void
  createLabel?: string
  actions?: ReactNode
}) {
  return (
    <Card
      size="sm"
      className="overflow-hidden border-white/60 bg-white/85 py-0 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75"
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
              {eyebrow}
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 sm:text-sm dark:text-slate-300">
              {description}
            </p>
            {badges.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {badges.map((badge, index) => (
                  <Badge
                    key={index}
                    variant={badge.variant ?? "outline"}
                    className="rounded-full px-2 py-0.5 text-[10px]"
                  >
                    {badge.label}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {onRefresh ? (
              <AppRefreshButton
                triggerRefresh={onRefresh}
                title="Refresh"
                size="sm"
              />
            ) : null}
            {actions}
            {onCreate ? (
              <AppAddNewButton
                openCreateDialog={onCreate}
                title={createLabel ?? "New record"}
                size="sm"
              />
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
