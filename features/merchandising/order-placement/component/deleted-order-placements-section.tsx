/* eslint-disable react-hooks/incompatible-library */
"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ClipboardCheck, MoreHorizontal, Search } from "lucide-react"
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table"

import { AppCombobox, type AppComboboxLoadParams, type AppComboboxLoadResult, type AppComboboxOption } from "@/components/app-combobox"
import { AppDataTable } from "@/components/app-data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import type { OrderPlacementFilterValues, OrderPlacementRecord, PaginationMeta } from "../order-placement.types"

type DeletedOrderPlacementsSectionProps = {
  deletedRecords: OrderPlacementRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeleted: boolean
  deletedError: string
  deletedDraftFilters: OrderPlacementFilterValues
  deletedActiveFilters: OrderPlacementFilterValues
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadJobOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadSupplierOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  onDeletedDraftFiltersChange: (nextValues: OrderPlacementFilterValues) => void
  onDeletedActiveFiltersChange: (nextValues: OrderPlacementFilterValues) => void
  onDeletedPageChange: (nextPage: number) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (record: OrderPlacementRecord, mode: "restore" | "permanent") => void
  canRestore: boolean
  canPermanentlyDelete: boolean
}

function getBuyerLabel(record: OrderPlacementRecord) {
  return record.buyer?.displayName?.trim() || record.buyer?.name?.trim() || "No buyer"
}

function getJobLabel(record: OrderPlacementRecord) {
  return record.job?.jobNo?.trim() || record.jobId
}

function getSupplierLabel(record: OrderPlacementRecord) {
  return [record.factory?.code?.trim(), record.factory?.name?.trim()].filter(Boolean).join(" - ") || record.factoryId
}

function getPoLabel(record: OrderPlacementRecord) {
  const values = (record.orderPlacementDetails ?? [])
    .map((detail) => detail.purchaseOrder?.pono?.trim())
    .filter((value): value is string => Boolean(value))
  return values.length ? [...new Set(values)].join(", ") : "No PO"
}

function getUserLabel(user?: { name?: string | null } | null, fallback?: string | null) {
  return user?.name?.trim() || fallback?.trim() || ""
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10)
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <ClipboardCheck className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  )
}

export function DeletedOrderPlacementsSection({
  deletedRecords,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeleted,
  deletedError,
  deletedDraftFilters,
  deletedActiveFilters,
  loadBuyerOptions,
  loadJobOptions,
  loadSupplierOptions,
  onDeletedDraftFiltersChange,
  onDeletedActiveFiltersChange,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  canRestore,
  canPermanentlyDelete,
}: DeletedOrderPlacementsSectionProps) {
  const [selectedBuyer, setSelectedBuyer] = useState<AppComboboxOption | null>(null)
  const [selectedJob, setSelectedJob] = useState<AppComboboxOption | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<AppComboboxOption | null>(null)
  const filterBuyerValue = deletedDraftFilters.buyerId && selectedBuyer?.value === deletedDraftFilters.buyerId ? selectedBuyer : null
  const filterJobValue = deletedDraftFilters.jobId && selectedJob?.value === deletedDraftFilters.jobId ? selectedJob : null
  const filterSupplierValue = deletedDraftFilters.factoryId && selectedSupplier?.value === deletedDraftFilters.factoryId ? selectedSupplier : null

  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) return "No deleted order placements found"
    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedFilterCount = useMemo(
    () => [deletedDraftFilters.buyerId, deletedDraftFilters.jobId, deletedDraftFilters.factoryId, deletedDraftFilters.pono].filter((value) => value.trim()).length,
    [deletedDraftFilters],
  )
  const deletedFiltersActive = Boolean(deletedActiveFilters.buyerId || deletedActiveFilters.jobId || deletedActiveFilters.factoryId || deletedActiveFilters.pono)

  const columns = useMemo<ColumnDef<OrderPlacementRecord>[]>(
    () => [
      {
        id: "job",
        header: "Job",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{getJobLabel(row.original)}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">PO: {getPoLabel(row.original)}</p>
          </div>
        ),
      },
      { id: "buyer", header: "Buyer", cell: ({ row }) => <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{getBuyerLabel(row.original)}</span> },
      { id: "factory", header: "Factory", cell: ({ row }) => <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{getSupplierLabel(row.original)}</span> },
      { id: "placementDate", header: "Placement", cell: ({ row }) => <span className="text-xs text-slate-700 dark:text-slate-200">{formatDate(row.original.placementDate)}</span> },
      {
        id: "deleted",
        header: "Deleted",
        cell: ({ row }) => {
          const deletedBy = getUserLabel(row.original.deleted_by_user, row.original.deleted_by_id)
          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(row.original.deleted_at)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{deletedBy ? `Deleted by ${deletedBy}` : "Deleted item"}</p>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const hasActions = canRestore || canPermanentlyDelete
          if (!hasActions) return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>
          return (
            <div className="pr-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open deleted order placement actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {canRestore ? <DropdownMenuItem onSelect={() => onOpenAction(row.original, "restore")}>Restore placement</DropdownMenuItem> : null}
                  {canRestore && canPermanentlyDelete ? <DropdownMenuSeparator /> : null}
                  {canPermanentlyDelete ? <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(row.original, "permanent")}>Delete permanently</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [canPermanentlyDelete, canRestore, onOpenAction],
  )

  const table = useReactTable({ data: deletedRecords, columns, getCoreRowModel: getCoreRowModel() })

  function resetFilters() {
    const cleared: OrderPlacementFilterValues = { buyerId: "", jobId: "", currencyId: "", factoryId: "", placementDate: "", isPlaced: "", pono: "" }
    setSelectedBuyer(null)
    setSelectedJob(null)
    setSelectedSupplier(null)
    onDeletedDraftFiltersChange(cleared)
    onDeletedActiveFiltersChange(cleared)
    onDeletedPageChange(1)
  }

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Deleted order placements</CardTitle>
            <CardDescription>{deletedPageSummary}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">{deletedMeta?.total ?? deletedRecords.length} deleted</Badge>
            <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">{deletedFilterCount} active filter{deletedFilterCount === 1 ? "" : "s"}</Badge>
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
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedPlacementPo" className="text-xs font-medium text-slate-700 dark:text-slate-300">PO Number</label>
            <Input id="deletedPlacementPo" value={deletedDraftFilters.pono} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, pono: event.target.value })} placeholder="Input PO number" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedPlacementBuyer" className="text-xs font-medium text-slate-700 dark:text-slate-300">Buyer</label>
            <AppCombobox value={filterBuyerValue} onValueChange={(buyer) => { setSelectedBuyer(buyer); onDeletedDraftFiltersChange({ ...deletedDraftFilters, buyerId: buyer?.value ?? "" }) }} loadItems={loadBuyerOptions} inputProps={{ id: "deletedPlacementBuyer" }} placeholder="All buyers" showClear={Boolean(deletedDraftFilters.buyerId)} inputClassName="h-7 rounded-md px-2 text-xs" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedPlacementJob" className="text-xs font-medium text-slate-700 dark:text-slate-300">Job</label>
            <AppCombobox value={filterJobValue} onValueChange={(job) => { setSelectedJob(job); onDeletedDraftFiltersChange({ ...deletedDraftFilters, jobId: job?.value ?? "" }) }} loadItems={loadJobOptions} inputProps={{ id: "deletedPlacementJob" }} placeholder="All jobs" showClear={Boolean(deletedDraftFilters.jobId)} inputClassName="h-7 rounded-md px-2 text-xs" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedPlacementSupplier" className="text-xs font-medium text-slate-700 dark:text-slate-300">Factory</label>
            <AppCombobox value={filterSupplierValue} onValueChange={(supplier) => { setSelectedSupplier(supplier); onDeletedDraftFiltersChange({ ...deletedDraftFilters, factoryId: supplier?.value ?? "" }) }} loadItems={loadSupplierOptions} inputProps={{ id: "deletedPlacementSupplier" }} placeholder="All factories" showClear={Boolean(deletedDraftFilters.factoryId)} inputClassName="h-7 rounded-md px-2 text-xs" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-4 xl:justify-self-end">
            <Button type="submit" className="w-full rounded-xl sm:w-auto"><Search className="size-3.5" /> Search</Button>
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={resetFilters}>Reset</Button>
          </div>
        </form>
      </CardContent>

      <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
        {deletedError ? <div className="p-4"><EmptyState title="Unable to load deleted order placements" description={deletedError} /></div> : null}
        {!deletedError ? (
          <>
            <div className="lg:hidden">
              {loadingDeleted ? (
                <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}</div>
              ) : deletedRecords.length > 0 ? (
                <div className="space-y-3 p-4">
                  {deletedRecords.map((record) => {
                    const deletedBy = getUserLabel(record.deleted_by_user, record.deleted_by_id)
                    return (
                      <article key={record.id} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{getJobLabel(record)}</p>
                            <p className="mt-1 truncate text-xs font-medium text-slate-600 dark:text-slate-300">PO: {getPoLabel(record)}</p>
                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{getSupplierLabel(record)}</p>
                          </div>
                          {canRestore || canPermanentlyDelete ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="rounded-full"><MoreHorizontal className="size-3.5" /><span className="sr-only">Open deleted placement actions</span></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {canRestore ? <DropdownMenuItem onSelect={() => onOpenAction(record, "restore")}>Restore placement</DropdownMenuItem> : null}
                                {canRestore && canPermanentlyDelete ? <DropdownMenuSeparator /> : null}
                                {canPermanentlyDelete ? <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(record, "permanent")}>Delete permanently</DropdownMenuItem> : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="destructive" className="rounded-full px-3 py-1">Deleted</Badge>
                          <Badge variant="outline" className="rounded-full px-3 py-1">{getBuyerLabel(record)}</Badge>
                        </div>
                        <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p>Placement: {formatDate(record.placementDate)}</p>
                          <p>Deleted: {formatDate(record.deleted_at)}</p>
                          <p>{deletedBy ? `Deleted by ${deletedBy}` : "Deleted item"}</p>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4"><EmptyState title="No deleted order placements found" description={deletedFiltersActive ? "Try clearing or relaxing the current filters." : "Soft deleted placements will appear here when users remove them."} /></div>
              )}
              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(1)} disabled={loadingDeleted || deletedPage <= 1}><ChevronsLeft className="size-3.5" /></Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.max(1, deletedPage - 1))} disabled={loadingDeleted || deletedPage <= 1}><ChevronLeft className="size-3.5" /></Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.min(deletedMeta?.totalPages ?? 1, deletedPage + 1))} disabled={loadingDeleted || deletedPage >= (deletedMeta?.totalPages ?? 1)}><ChevronRight className="size-3.5" /></Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(deletedMeta?.totalPages ?? 1)} disabled={loadingDeleted || deletedPage >= (deletedMeta?.totalPages ?? 1)}><ChevronsRight className="size-3.5" /></Button>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <AppDataTable table={table} pageSummary={deletedPageSummary} page={deletedPage} totalPages={deletedMeta?.totalPages ?? 1} pageSize={deletedLimit} isLoading={loadingDeleted} pageSizeOptions={[5, 10, 25, 50]} leadingColumnIds={["job"]} onPageChange={(nextPage) => onDeletedPageChange(nextPage)} onPageSizeChange={(nextPageSize) => { onDeletedLimitChange(nextPageSize); onDeletedPageChange(1) }} emptyState={<EmptyState title="No deleted order placements found" description={deletedFiltersActive ? "Try clearing or relaxing the current filters." : "Soft deleted placements will appear here when users remove them."} />} />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
