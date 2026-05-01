"use client"

import { useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Search,
} from "lucide-react"
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { AppDataTable } from "@/components/app-data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import type { PaginationMeta, UnitFilterValues, UnitRecord } from "../unit.types"

type DeletedUnitActionMode = "restore" | "permanent"

type DeletedUnitsCardProps = {
  deletedUnits: UnitRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeletedUnits: boolean
  deletedError: string
  deletedDraftFilters: UnitFilterValues
  deletedActiveFilters: UnitFilterValues
  onDeletedDraftFiltersChange: (nextValues: UnitFilterValues) => void
  onDeletedActiveFiltersChange: (nextValues: UnitFilterValues) => void
  onDeletedPageChange: (nextPage: number) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (unit: UnitRecord, mode: DeletedUnitActionMode) => void
  canRestoreUnit: boolean
  canPermanentlyDeleteUnit: boolean
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

export function DeletedUnitsCard({
  deletedUnits,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeletedUnits,
  deletedError,
  deletedDraftFilters,
  deletedActiveFilters,
  onDeletedDraftFiltersChange,
  onDeletedActiveFiltersChange,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  canRestoreUnit,
  canPermanentlyDeleteUnit,
}: DeletedUnitsCardProps) {
  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) {
      return "No deleted units found"
    }

    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedFilterCount = useMemo(
    () => [deletedDraftFilters.name, deletedDraftFilters.shortName, deletedDraftFilters.isActive].filter((value) => value.trim()).length,
    [deletedDraftFilters],
  )

  const deletedFiltersActive = Boolean(deletedActiveFilters.name || deletedActiveFilters.shortName || deletedActiveFilters.isActive)

  const deletedColumns = useMemo<ColumnDef<UnitRecord>[]>(
    () => [
      {
        id: "unit",
        header: "Unit",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{row.original.name}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">Short: {row.original.shortName}</p>
          </div>
        ),
      },
      {
        id: "deleted",
        header: "Deleted",
        cell: ({ row }) => {
          const unit = row.original
          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(unit.deleted_at)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserLabel(unit.deleted_by_user, unit.deleted_by_id)
                  ? `Deleted by ${getUserLabel(unit.deleted_by_user, unit.deleted_by_id)}`
                  : "Deleted item"}
              </p>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const unit = row.original
          const hasActions = canRestoreUnit || canPermanentlyDeleteUnit

          if (!hasActions) {
            return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>
          }

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
                  {canRestoreUnit ? (
                    <DropdownMenuItem onSelect={() => onOpenAction(unit, "restore")}>
                      Restore unit
                    </DropdownMenuItem>
                  ) : null}
                  {canRestoreUnit && canPermanentlyDeleteUnit ? <DropdownMenuSeparator /> : null}
                  {canPermanentlyDeleteUnit ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(unit, "permanent")}>
                      Delete permanently
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [canPermanentlyDeleteUnit, canRestoreUnit, onOpenAction],
  )

  const deletedTable = useReactTable({
    data: deletedUnits,
    columns: deletedColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Deleted units</CardTitle>
            <CardDescription>Restore old soft deleted units or remove them permanently.</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
            {deletedMeta?.total ?? deletedUnits.length} deleted
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-b border-slate-200/70 p-4 dark:border-white/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid w-full gap-3 sm:grid-cols-1 lg:max-w-2xl">
              <div className="space-y-1">
                <label htmlFor="deletedUnitName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Unit name
                </label>
                <Input
                  id="deletedUnitName"
                  value={deletedDraftFilters.name}
                  className="h-9 rounded-md px-2 text-xs"
                  onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, name: event.target.value })}
                  placeholder="Input unit name"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="w-full rounded-xl sm:w-auto"
                onClick={() => {
                  onDeletedActiveFiltersChange(deletedDraftFilters)
                  onDeletedPageChange(1)
                }}
              >
                <Search className="size-3.5" />
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl sm:w-auto"
                onClick={() => {
                  const cleared = { name: "", shortName: "", isActive: "" }
                  onDeletedDraftFiltersChange(cleared)
                  onDeletedActiveFiltersChange(cleared)
                  onDeletedPageChange(1)
                }}
              >
                Reset
              </Button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
              {deletedFilterCount} active filter{deletedFilterCount === 1 ? "" : "s"}
            </Badge>
            <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
          </div>
        </div>

        {deletedError ? (
          <div className="p-4">
            <EmptyState title="Unable to load deleted units" description={deletedError} />
          </div>
        ) : null}

        {!deletedError ? (
          <>
            <div className="lg:hidden">
              {loadingDeletedUnits ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 rounded-2xl" />
                  ))}
                </div>
              ) : deletedUnits.length > 0 ? (
                <div className="space-y-3 p-4">
                  {deletedUnits.map((unit) => (
                    <article key={unit.id} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{unit.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Short: {unit.shortName}</p>
                        </div>
                        {canRestoreUnit || canPermanentlyDeleteUnit ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {canRestoreUnit ? <DropdownMenuItem onSelect={() => onOpenAction(unit, "restore")}>Restore unit</DropdownMenuItem> : null}
                              {canRestoreUnit && canPermanentlyDeleteUnit ? <DropdownMenuSeparator /> : null}
                              {canPermanentlyDeleteUnit ? <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(unit, "permanent")}>Delete permanently</DropdownMenuItem> : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Deleted: {formatDate(unit.deleted_at)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState
                    title="No deleted units found"
                    description={deletedFiltersActive ? "Try clearing or relaxing the current filters." : "Soft deleted units will appear here when users remove them."}
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(1)} disabled={loadingDeletedUnits || deletedPage <= 1}><ChevronsLeft className="size-3.5" /></Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.max(1, deletedPage - 1))} disabled={loadingDeletedUnits || deletedPage <= 1}><ChevronLeft className="size-3.5" /></Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.min(deletedMeta?.totalPages ?? 1, deletedPage + 1))} disabled={loadingDeletedUnits || deletedPage >= (deletedMeta?.totalPages ?? 1)}><ChevronRight className="size-3.5" /></Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(deletedMeta?.totalPages ?? 1)} disabled={loadingDeletedUnits || deletedPage >= (deletedMeta?.totalPages ?? 1)}><ChevronsRight className="size-3.5" /></Button>
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
                isLoading={loadingDeletedUnits}
                pageSizeOptions={[5, 10, 25, 50]}
                onPageChange={(nextPage) => onDeletedPageChange(nextPage)}
                onPageSizeChange={(nextPageSize) => {
                  onDeletedLimitChange(nextPageSize)
                  onDeletedPageChange(1)
                }}
                emptyState={
                  <EmptyState
                    title="No deleted units found"
                    description={deletedFiltersActive ? "Try clearing or relaxing the current filters." : "Soft deleted units will appear here when users remove them."}
                  />
                }
              />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
