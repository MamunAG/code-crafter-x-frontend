"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, Search, ScissorsLineDashed } from "lucide-react"
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table"

import { AppDataTable } from "@/components/app-data-table"
import { AppSelect } from "@/components/app-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import type { FabricProcessFilterValues, FabricProcessRecord, PaginationMeta } from "../fabric-process.types"

const ALL_STATUS_VALUE = "__all_statuses__"
const STATUS_OPTIONS = [
  { value: ALL_STATUS_VALUE, label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
]

type ActiveFabricProcessesSectionProps = {
  fabricProcesses: FabricProcessRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loadingFabricProcesses: boolean
  draftFilters: FabricProcessFilterValues
  activeFilters: FabricProcessFilterValues
  onDraftFiltersChange: (nextValues: FabricProcessFilterValues) => void
  onActiveFiltersChange: (nextValues: FabricProcessFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreateFabricProcess: () => void
  onEditFabricProcess: (fabricProcessId: number) => void
  onDeleteFabricProcess: (fabricProcess: FabricProcessRecord) => void
  onResetFilters: () => void
  canCreateFabricProcess: boolean
  canUpdateFabricProcess: boolean
  canDeleteFabricProcess: boolean
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function getUserLabel(user?: { name?: string | null } | null, fallback?: string | null) {
  return user?.name?.trim() || fallback?.trim() || ""
}

function fabricProcessBadgeTone(fabricProcess?: FabricProcessRecord | null) {
  if (!fabricProcess) return "outline" as const
  if (fabricProcess.deleted_at) return "destructive" as const
  return fabricProcess.isActive === false ? "outline" : "secondary"
}

function formatStage(stage: FabricProcessRecord["stage"]) {
  return stage.replaceAll("_", " ").toLowerCase()
}

function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <ScissorsLineDashed className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">
        {actionLabel}
      </Button>
    </div>
  )
}

export function ActiveFabricProcessesSection({
  fabricProcesses,
  meta,
  page,
  limit,
  loadingFabricProcesses,
  draftFilters,
  activeFilters,
  onDraftFiltersChange,
  onActiveFiltersChange,
  onPageChange,
  onLimitChange,
  onCreateFabricProcess,
  onEditFabricProcess,
  onDeleteFabricProcess,
  onResetFilters,
  canCreateFabricProcess,
  canUpdateFabricProcess,
  canDeleteFabricProcess,
}: ActiveFabricProcessesSectionProps) {
  const filterCount = useMemo(
    () => [draftFilters.name, draftFilters.isActive].filter((value) => value.trim()).length,
    [draftFilters],
  )
  const filtersActive = Boolean(activeFilters.name || activeFilters.isActive)

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No fabric processes found"
    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<FabricProcessRecord>[]>(
    () => [
      {
        id: "fabricProcess",
        header: "Fabric process",
        cell: ({ row }) => {
          const fabricProcess = row.original
          return (
            <div className="pl-4">
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
                  {(fabricProcess.name?.trim() || "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{fabricProcess.name}</p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {formatStage(fabricProcess.stage)}
                  </p>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const fabricProcess = row.original
          const label = fabricProcess.deleted_at ? "Deleted" : fabricProcess.isActive === false ? "Inactive" : "Active"
          return <Badge variant={fabricProcessBadgeTone(fabricProcess)} className="rounded-full px-3 py-1">{label}</Badge>
        },
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => {
          const fabricProcess = row.original
          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(fabricProcess.created_at)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserLabel(fabricProcess.created_by_user, fabricProcess.created_by_id) || "No creator metadata"}
              </p>
            </div>
          )
        },
      },
      {
        id: "updated",
        header: "Updated",
        cell: ({ row }) => {
          const fabricProcess = row.original
          const editorLabel = getUserLabel(fabricProcess.updated_by_user, fabricProcess.updated_by_id)
          if (!fabricProcess.updated_by_id && !fabricProcess.updated_by_user) {
            return <p className="text-xs text-slate-500 dark:text-slate-400">Not edited yet</p>
          }
          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(fabricProcess.updated_at)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{editorLabel || "No editor metadata"}</p>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const fabricProcess = row.original
          const hasActions = canUpdateFabricProcess || canDeleteFabricProcess
          if (!hasActions) return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>

          return (
            <div className="pr-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canUpdateFabricProcess ? <DropdownMenuItem onSelect={() => onEditFabricProcess(fabricProcess.id)}>Edit fabric process</DropdownMenuItem> : null}
                  {canUpdateFabricProcess && canDeleteFabricProcess ? <DropdownMenuSeparator /> : null}
                  {canDeleteFabricProcess ? <DropdownMenuItem variant="destructive" onSelect={() => onDeleteFabricProcess(fabricProcess)}>Delete fabric process</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [canDeleteFabricProcess, canUpdateFabricProcess, onDeleteFabricProcess, onEditFabricProcess],
  )

  const table = useReactTable({ data: fabricProcesses, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription className="text-xs">Search by fabric process name and status.</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">
            {filterCount} active filter{filterCount === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-0 sm:px-2">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onActiveFiltersChange(draftFilters)
            onPageChange(1)
          }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterFabricProcessName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Fabric process name</label>
            <Input
              id="filterFabricProcessName"
              value={draftFilters.name}
              className="h-9 rounded-md px-2 text-xs"
              onChange={(event) => onDraftFiltersChange({ ...draftFilters, name: event.target.value })}
              placeholder="Input fabric process name"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
            <AppSelect
              value={draftFilters.isActive || ALL_STATUS_VALUE}
              options={STATUS_OPTIONS}
              onValueChange={(value) => onDraftFiltersChange({ ...draftFilters, isActive: value === ALL_STATUS_VALUE ? "" : value })}
              triggerClassName="h-9 rounded-md text-xs"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-2">
            <Button type="submit" className="w-full rounded-xl sm:w-auto"><Search className="size-3.5" />Search</Button>
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={onResetFilters}>Reset</Button>
          </div>
        </form>
      </CardContent>

      <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
        <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Fabric processes table</CardTitle>
              <CardDescription>{pageSummary}</CardDescription>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="lg:hidden">
            {loadingFabricProcesses ? (
              <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}</div>
            ) : fabricProcesses.length > 0 ? (
              <div className="space-y-3 p-4">
                {fabricProcesses.map((fabricProcess) => {
                  const label = fabricProcess.deleted_at ? "Deleted" : fabricProcess.isActive === false ? "Inactive" : "Active"
                  return (
                    <article key={fabricProcess.id} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{fabricProcess.name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {formatStage(fabricProcess.stage)}
                          </p>
                        </div>
                        {canUpdateFabricProcess || canDeleteFabricProcess ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="rounded-full"><MoreHorizontal className="size-3.5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {canUpdateFabricProcess ? <DropdownMenuItem onSelect={() => onEditFabricProcess(fabricProcess.id)}>Edit fabric process</DropdownMenuItem> : null}
                              {canUpdateFabricProcess && canDeleteFabricProcess ? <DropdownMenuSeparator /> : null}
                              {canDeleteFabricProcess ? <DropdownMenuItem variant="destructive" onSelect={() => onDeleteFabricProcess(fabricProcess)}>Delete fabric process</DropdownMenuItem> : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2"><Badge variant={fabricProcessBadgeTone(fabricProcess)} className="rounded-full px-3 py-1">{label}</Badge></div>
                      <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="block">Created: {formatDate(fabricProcess.created_at)}</span>
                        {fabricProcess.updated_by_id || fabricProcess.updated_by_user ? <span className="block">Updated: {formatDate(fabricProcess.updated_at)}</span> : <span className="block">Not edited yet</span>}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="p-4">
                <EmptyState
                  title="No fabric processes found"
                  description={filtersActive ? "Try clearing or relaxing the current filters." : canCreateFabricProcess ? "Create the first merchandising fabric process to get started." : "No fabric process records are available for the selected organization."}
                  actionLabel={filtersActive || !canCreateFabricProcess ? "Reset filters" : "New fabric process"}
                  onAction={filtersActive || !canCreateFabricProcess ? onResetFilters : onCreateFabricProcess}
                />
              </div>
            )}
            <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">{pageSummary}</p>
              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(1)} disabled={loadingFabricProcesses || page <= 1}><ChevronsLeft className="size-3.5" /></Button>
                <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.max(1, current - 1))} disabled={loadingFabricProcesses || page <= 1}><ChevronLeft className="size-3.5" /></Button>
                <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.min(meta?.totalPages ?? 1, current + 1))} disabled={loadingFabricProcesses || page >= (meta?.totalPages ?? 1)}><ChevronRight className="size-3.5" /></Button>
                <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(meta?.totalPages ?? 1)} disabled={loadingFabricProcesses || page >= (meta?.totalPages ?? 1)}><ChevronsRight className="size-3.5" /></Button>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <AppDataTable
              table={table}
              pageSummary={pageSummary}
              page={page}
              totalPages={meta?.totalPages ?? 1}
              pageSize={limit}
              isLoading={loadingFabricProcesses}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={(nextPage) => onPageChange(nextPage)}
              onPageSizeChange={(nextPageSize) => {
                onLimitChange(nextPageSize)
                onPageChange(1)
              }}
              emptyState={<EmptyState title="No fabric processes found" description={filtersActive ? "Try clearing or relaxing the current filters." : canCreateFabricProcess ? "Create the first merchandising fabric process to get started." : "No fabric process records are available for the selected organization."} actionLabel={filtersActive || !canCreateFabricProcess ? "Reset filters" : "New fabric process"} onAction={filtersActive || !canCreateFabricProcess ? onResetFilters : onCreateFabricProcess} />}
            />
          </div>
        </CardContent>
      </Card>
    </Card>
  )
}
