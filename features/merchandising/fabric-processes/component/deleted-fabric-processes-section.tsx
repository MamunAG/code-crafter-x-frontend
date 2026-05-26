"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, Search } from "lucide-react"
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table"

import { AppDataTable } from "@/components/app-data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import type { FabricProcessFilterValues, FabricProcessRecord, PaginationMeta } from "../fabric-process.types"

type DeletedFabricProcessActionMode = "restore" | "permanent"

type DeletedFabricProcessesSectionProps = {
  deletedFabricProcesses: FabricProcessRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeletedFabricProcesses: boolean
  deletedError: string
  deletedDraftFilters: FabricProcessFilterValues
  deletedActiveFilters: FabricProcessFilterValues
  onDeletedDraftFiltersChange: (nextValues: FabricProcessFilterValues) => void
  onDeletedActiveFiltersChange: (nextValues: FabricProcessFilterValues) => void
  onDeletedPageChange: (nextPage: number) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (fabricProcess: FabricProcessRecord, mode: DeletedFabricProcessActionMode) => void
  canRestoreFabricProcess: boolean
  canPermanentlyDeleteFabricProcess: boolean
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

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  )
}

export function DeletedFabricProcessesSection({
  deletedFabricProcesses,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeletedFabricProcesses,
  deletedError,
  deletedDraftFilters,
  deletedActiveFilters,
  onDeletedDraftFiltersChange,
  onDeletedActiveFiltersChange,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  canRestoreFabricProcess,
  canPermanentlyDeleteFabricProcess,
}: DeletedFabricProcessesSectionProps) {
  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) return "No deleted fabric processes found"
    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedFilterCount = useMemo(
    () => [deletedDraftFilters.name].filter((value) => value.trim()).length,
    [deletedDraftFilters],
  )
  const deletedFiltersActive = Boolean(deletedActiveFilters.name)

  const deletedColumns = useMemo<ColumnDef<FabricProcessRecord>[]>(
    () => [
      {
        id: "fabricProcess",
        header: "Fabric process",
        cell: ({ row }) => {
          const fabricProcess = row.original
          return (
            <div className="pl-4">
              <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{fabricProcess.name}</p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">ID #{fabricProcess.id}</p>
            </div>
          )
        },
      },
      {
        id: "deleted",
        header: "Deleted",
        cell: ({ row }) => {
          const fabricProcess = row.original
          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(fabricProcess.deleted_at)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserLabel(fabricProcess.deleted_by_user, fabricProcess.deleted_by_id) || "Deleted item"}
              </p>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const fabricProcess = row.original
          const hasActions = canRestoreFabricProcess || canPermanentlyDeleteFabricProcess
          if (!hasActions) return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>

          return (
            <div className="pr-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open deleted item actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canRestoreFabricProcess ? <DropdownMenuItem onSelect={() => onOpenAction(fabricProcess, "restore")}>Restore fabric process</DropdownMenuItem> : null}
                  {canRestoreFabricProcess && canPermanentlyDeleteFabricProcess ? <DropdownMenuSeparator /> : null}
                  {canPermanentlyDeleteFabricProcess ? <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(fabricProcess, "permanent")}>Delete permanently</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [canPermanentlyDeleteFabricProcess, canRestoreFabricProcess, onOpenAction],
  )

  const deletedTable = useReactTable({ data: deletedFabricProcesses, columns: deletedColumns, getCoreRowModel: getCoreRowModel() })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Deleted fabric processes</CardTitle>
            <CardDescription>Restore old soft deleted fabric processes or remove them permanently.</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">{deletedMeta?.total ?? deletedFabricProcesses.length} deleted</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-b border-slate-200/70 p-4 dark:border-white/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid w-full gap-3 sm:grid-cols-1 lg:max-w-xl">
              <div className="space-y-1">
                <label htmlFor="deletedFabricProcessName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Fabric process name</label>
                <Input
                  id="deletedFabricProcessName"
                  value={deletedDraftFilters.name}
                  className="h-9 rounded-md px-2 text-xs"
                  onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, name: event.target.value })}
                  placeholder="Input fabric process name"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" className="w-full rounded-xl sm:w-auto" onClick={() => { onDeletedActiveFiltersChange(deletedDraftFilters); onDeletedPageChange(1) }}><Search className="size-3.5" />Search</Button>
              <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={() => { const cleared = { name: "", isActive: "" }; onDeletedDraftFiltersChange(cleared); onDeletedActiveFiltersChange(cleared); onDeletedPageChange(1) }}>Reset</Button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">{deletedFilterCount} active filter{deletedFilterCount === 1 ? "" : "s"}</Badge>
            <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
          </div>
        </div>

        {deletedError ? <div className="p-4"><EmptyState title="Unable to load deleted fabric processes" description={deletedError} /></div> : null}

        {!deletedError ? (
          <>
            <div className="lg:hidden">
              {loadingDeletedFabricProcesses ? (
                <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}</div>
              ) : deletedFabricProcesses.length > 0 ? (
                <div className="space-y-3 p-4">
                  {deletedFabricProcesses.map((fabricProcess) => (
                    <article key={fabricProcess.id} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{fabricProcess.name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">ID #{fabricProcess.id}</p>
                        </div>
                        {canRestoreFabricProcess || canPermanentlyDeleteFabricProcess ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="rounded-full"><MoreHorizontal className="size-3.5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {canRestoreFabricProcess ? <DropdownMenuItem onSelect={() => onOpenAction(fabricProcess, "restore")}>Restore fabric process</DropdownMenuItem> : null}
                              {canRestoreFabricProcess && canPermanentlyDeleteFabricProcess ? <DropdownMenuSeparator /> : null}
                              {canPermanentlyDeleteFabricProcess ? <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(fabricProcess, "permanent")}>Delete permanently</DropdownMenuItem> : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Deleted: {formatDate(fabricProcess.deleted_at)}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{getUserLabel(fabricProcess.deleted_by_user, fabricProcess.deleted_by_id) || "Deleted item"}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-4"><EmptyState title="No deleted fabric processes found" description={deletedFiltersActive ? "Try clearing or relaxing the current filters." : "Soft deleted fabric processes will appear here when users remove them."} /></div>
              )}
              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(1)} disabled={loadingDeletedFabricProcesses || deletedPage <= 1}><ChevronsLeft className="size-3.5" /></Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.max(1, deletedPage - 1))} disabled={loadingDeletedFabricProcesses || deletedPage <= 1}><ChevronLeft className="size-3.5" /></Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.min(deletedMeta?.totalPages ?? 1, deletedPage + 1))} disabled={loadingDeletedFabricProcesses || deletedPage >= (deletedMeta?.totalPages ?? 1)}><ChevronRight className="size-3.5" /></Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(deletedMeta?.totalPages ?? 1)} disabled={loadingDeletedFabricProcesses || deletedPage >= (deletedMeta?.totalPages ?? 1)}><ChevronsRight className="size-3.5" /></Button>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <AppDataTable
                table={deletedTable}
                pageSummary={deletedPageSummary}
                page={deletedPage}
                totalPages={deletedMeta?.totalPages ?? 1}
                pageSize={deletedLimit}
                isLoading={loadingDeletedFabricProcesses}
                pageSizeOptions={[5, 10, 25, 50]}
                onPageChange={(nextPage) => onDeletedPageChange(nextPage)}
                onPageSizeChange={(nextPageSize) => { onDeletedLimitChange(nextPageSize); onDeletedPageChange(1) }}
                emptyState={<EmptyState title="No deleted fabric processes found" description={deletedFiltersActive ? "Try clearing or relaxing the current filters." : "Soft deleted fabric processes will appear here when users remove them."} />}
              />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}