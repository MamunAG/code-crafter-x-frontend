/* eslint-disable react-hooks/incompatible-library */
"use client"

import { useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Layers3,
  MoreHorizontal,
  Search,
} from "lucide-react"
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  AppCombobox,
  type AppComboboxLoadParams,
  type AppComboboxLoadResult,
  type AppComboboxOption,
} from "@/components/app-combobox"
import { AppDataTable } from "@/components/app-data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import type {
  FabricCostingFilterValues,
  FabricCostingRecord,
  PaginationMeta,
} from "../fabric-costing.types"

type DeleteFabricCostSectionProps = {
  deletedRecords: FabricCostingRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeletedRecords: boolean
  deletedError: string
  deletedDraftFilters: FabricCostingFilterValues
  deletedActiveFilters: FabricCostingFilterValues
  loadMaterialOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  onDeletedDraftFiltersChange: (nextValues: FabricCostingFilterValues) => void
  onDeletedActiveFiltersChange: (nextValues: FabricCostingFilterValues) => void
  onDeletedPageChange: (nextPage: number) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (record: FabricCostingRecord, mode: "restore" | "permanent") => void
  canRestoreFabricCosting: boolean
  canPermanentlyDeleteFabricCosting: boolean
}

const DEFAULT_FILTERS: FabricCostingFilterValues = {
  costName: "",
  fabricId: "",
  currencyId: "",
  unitId: "",
}

function getCostingLabel(record: FabricCostingRecord) {
  return record.costName?.trim() || record.fabric?.name?.trim() || "Unnamed fabric costing"
}

function getUserName(record: FabricCostingRecord) {
  const user = record.deleted_by_user
  return user?.display_name?.trim() || user?.name?.trim() || user?.user_name?.trim() || record.deleted_by_id?.trim() || ""
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function numberText(value?: string | number | null, fallback = "0") {
  if (value == null || value === "") return fallback
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return String(value)
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(4).replace(/\.?0+$/, "")
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <Layers3 className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  )
}

export function DeleteFabricCostSection({
  deletedRecords,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeletedRecords,
  deletedError,
  deletedDraftFilters,
  deletedActiveFilters,
  loadMaterialOptions,
  onDeletedDraftFiltersChange,
  onDeletedActiveFiltersChange,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  canRestoreFabricCosting,
  canPermanentlyDeleteFabricCosting,
}: DeleteFabricCostSectionProps) {
  const [selectedFilterFabric, setSelectedFilterFabric] = useState<AppComboboxOption | null>(null)
  const filterFabricValue =
    deletedDraftFilters.fabricId && selectedFilterFabric?.value === deletedDraftFilters.fabricId
      ? selectedFilterFabric
      : null

  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) return "No deleted fabric costings found"
    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedFilterCount = useMemo(
    () => [deletedDraftFilters.costName, deletedDraftFilters.fabricId].filter((value) => value.trim()).length,
    [deletedDraftFilters],
  )

  const deletedFiltersActive = Boolean(deletedActiveFilters.costName || deletedActiveFilters.fabricId)

  const columns = useMemo<ColumnDef<FabricCostingRecord>[]>(
    () => [
      {
        id: "costing",
        header: "Costing",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">
              {getCostingLabel(row.original)}
            </p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {row.original.fabric?.name?.trim() || "No fabric"}
            </p>
          </div>
        ),
      },
      {
        id: "quantity",
        header: "Quantity",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {numberText(row.original.qty, "1")} {row.original.unit?.name?.trim() || ""}
          </span>
        ),
      },
      {
        id: "finishedFabricCost",
        header: "Finished fabric cost",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {numberText(row.original.finishedFabricCost)}
          </span>
        ),
      },
      {
        id: "deleted",
        header: "Deleted",
        cell: ({ row }) => {
          const deletedBy = getUserName(row.original)
          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">{formatDateTime(row.original.deleted_at)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {deletedBy ? `Deleted by ${deletedBy}` : "Deleted item"}
              </p>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const hasActions = canRestoreFabricCosting || canPermanentlyDeleteFabricCosting
          if (!hasActions) {
            return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>
          }
          return (
            <div className="pr-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open deleted fabric costing actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canRestoreFabricCosting ? (
                    <DropdownMenuItem onSelect={() => onOpenAction(row.original, "restore")}>
                      Restore fabric costing
                    </DropdownMenuItem>
                  ) : null}
                  {canRestoreFabricCosting && canPermanentlyDeleteFabricCosting ? <DropdownMenuSeparator /> : null}
                  {canPermanentlyDeleteFabricCosting ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(row.original, "permanent")}>
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
    [canPermanentlyDeleteFabricCosting, canRestoreFabricCosting, onOpenAction],
  )

  const table = useReactTable({
    data: deletedRecords,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  function resetFilters() {
    setSelectedFilterFabric(null)
    onDeletedDraftFiltersChange(DEFAULT_FILTERS)
    onDeletedActiveFiltersChange(DEFAULT_FILTERS)
    onDeletedPageChange(1)
  }

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Deleted fabric costings</CardTitle>
            <CardDescription>{deletedPageSummary}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              {deletedMeta?.total ?? deletedRecords.length} deleted
            </Badge>
            <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">
              {deletedFilterCount} active filter{deletedFilterCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-0 sm:px-2">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onDeletedActiveFiltersChange(deletedDraftFilters)
            onDeletedPageChange(1)
          }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_auto]"
        >
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedFabricCostName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Cost name
            </label>
            <Input
              id="deletedFabricCostName"
              value={deletedDraftFilters.costName}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) =>
                onDeletedDraftFiltersChange({ ...deletedDraftFilters, costName: event.target.value })
              }
              placeholder="Input cost name"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedFabricMaterial" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Fabric
            </label>
            <AppCombobox
              value={filterFabricValue}
              onValueChange={(fabric) => {
                setSelectedFilterFabric(fabric)
                onDeletedDraftFiltersChange({ ...deletedDraftFilters, fabricId: fabric?.value ?? "" })
              }}
              loadItems={loadMaterialOptions}
              initialLimit={10}
              searchLimit={10}
              inputProps={{ id: "deletedFabricMaterial" }}
              placeholder="All fabrics"
              loadingMessage="Loading fabrics..."
              emptyMessage="No fabrics match your search."
              showClear={Boolean(deletedDraftFilters.fabricId)}
              inputClassName="h-7 rounded-md px-2 text-xs"
              contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
            <Button type="submit" className="w-full rounded-xl sm:w-auto">
              <Search className="size-3.5" />
              Search
            </Button>
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </form>
      </CardContent>

      <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
        {deletedError ? (
          <div className="p-4">
            <EmptyState title="Unable to load deleted fabric costings" description={deletedError} />
          </div>
        ) : null}

        {!deletedError ? (
          <>
            <div className="lg:hidden">
              {loadingDeletedRecords ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-2xl" />
                  ))}
                </div>
              ) : deletedRecords.length > 0 ? (
                <div className="space-y-3 p-4">
                  {deletedRecords.map((record) => {
                    const deletedBy = getUserName(record)
                    return (
                      <article
                        key={record.id}
                        className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                              {getCostingLabel(record)}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              {record.fabric?.name?.trim() || "No fabric"}
                            </p>
                          </div>
                          {canRestoreFabricCosting || canPermanentlyDeleteFabricCosting ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                                  <MoreHorizontal className="size-3.5" />
                                  <span className="sr-only">Open deleted fabric costing actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {canRestoreFabricCosting ? (
                                  <DropdownMenuItem onSelect={() => onOpenAction(record, "restore")}>
                                    Restore fabric costing
                                  </DropdownMenuItem>
                                ) : null}
                                {canRestoreFabricCosting && canPermanentlyDeleteFabricCosting ? (
                                  <DropdownMenuSeparator />
                                ) : null}
                                {canPermanentlyDeleteFabricCosting ? (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => onOpenAction(record, "permanent")}
                                  >
                                    Delete permanently
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="destructive" className="rounded-full px-3 py-1">Deleted</Badge>
                          <Badge variant="outline" className="rounded-full px-3 py-1">
                            Finished cost {numberText(record.finishedFabricCost)}
                          </Badge>
                        </div>
                        <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p>Qty: {numberText(record.qty, "1")} {record.unit?.name?.trim() || ""}</p>
                          <p>Deleted: {formatDateTime(record.deleted_at)}</p>
                          <p>{deletedBy ? `Deleted by ${deletedBy}` : "Deleted item"}</p>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState
                    title="No deleted fabric costings found"
                    description={
                      deletedFiltersActive
                        ? "Try clearing or relaxing the current filters."
                        : "Soft deleted fabric costings will appear here when users remove them."
                    }
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(1)} disabled={loadingDeletedRecords || deletedPage <= 1}>
                    <ChevronsLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.max(1, deletedPage - 1))} disabled={loadingDeletedRecords || deletedPage <= 1}>
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.min(deletedMeta?.totalPages ?? 1, deletedPage + 1))} disabled={loadingDeletedRecords || deletedPage >= (deletedMeta?.totalPages ?? 1)}>
                    <ChevronRight className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(deletedMeta?.totalPages ?? 1)} disabled={loadingDeletedRecords || deletedPage >= (deletedMeta?.totalPages ?? 1)}>
                    <ChevronsRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <AppDataTable
                table={table}
                pageSummary={deletedPageSummary}
                page={deletedPage}
                totalPages={deletedMeta?.totalPages ?? 1}
                pageSize={deletedLimit}
                isLoading={loadingDeletedRecords}
                pageSizeOptions={[5, 10, 25, 50]}
                leadingColumnIds={["costing"]}
                onPageChange={onDeletedPageChange}
                onPageSizeChange={(nextPageSize) => {
                  onDeletedLimitChange(nextPageSize)
                  onDeletedPageChange(1)
                }}
                emptyState={
                  <EmptyState
                    title="No deleted fabric costings found"
                    description={
                      deletedFiltersActive
                        ? "Try clearing or relaxing the current filters."
                        : "Soft deleted fabric costings will appear here when users remove them."
                    }
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
