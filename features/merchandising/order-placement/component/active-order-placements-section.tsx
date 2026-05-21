/* eslint-disable react-hooks/incompatible-library */
"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ClipboardCheck, MoreHorizontal, Plus, Search } from "lucide-react"
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table"

import { AppCombobox, type AppComboboxLoadParams, type AppComboboxLoadResult, type AppComboboxOption } from "@/components/app-combobox"
import { AppDataTable } from "@/components/app-data-table"
import { AppSelect } from "@/components/app-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import type { OrderPlacementFilterValues, OrderPlacementRecord, PaginationMeta } from "../order-placement.types"

type ActiveOrderPlacementsSectionProps = {
  records: OrderPlacementRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loading: boolean
  draftFilters: OrderPlacementFilterValues
  activeFilters: OrderPlacementFilterValues
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadJobOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadCurrencyOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadSupplierOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  onDraftFiltersChange: (nextValues: OrderPlacementFilterValues) => void
  onActiveFiltersChange: (nextValues: OrderPlacementFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreate: () => void
  onEdit: (id: string) => void
  onDelete: (record: OrderPlacementRecord) => void
  onResetFilters: () => void
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const ALL_STATUS_VALUE = "__all_placement_statuses__"

function getBuyerLabel(record: OrderPlacementRecord) {
  return record.buyer?.displayName?.trim() || record.buyer?.name?.trim() || "No buyer"
}

function getJobLabel(record: OrderPlacementRecord) {
  return record.job?.jobNo?.trim() || record.jobId
}

function getSupplierLabel(record: OrderPlacementRecord) {
  return [record.factory?.code?.trim(), record.factory?.name?.trim()].filter(Boolean).join(" - ") || record.factoryId
}

function getCurrencyLabel(record: OrderPlacementRecord) {
  return record.currency?.currencyCode?.trim() || record.currency?.currencyName?.trim() || String(record.currencyId)
}

function getPoLabel(record: OrderPlacementRecord) {
  const values = (record.orderPlacementDetails ?? [])
    .map((detail) => detail.purchaseOrder?.pono?.trim())
    .filter((value): value is string => Boolean(value))
  return values.length ? [...new Set(values)].join(", ") : "No PO"
}

function sumQuantity(record: OrderPlacementRecord) {
  return (record.orderPlacementDetails ?? []).reduce((total, detail) => total + (Number(detail.quantity) || 0), 0)
}

function sumFactoryFob(record: OrderPlacementRecord) {
  return (record.orderPlacementDetails ?? []).reduce((total, detail) => total + (Number(detail.totalFactoryFob) || 0), 0)
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0"
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "")
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10)
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(parsed)
}

function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <ClipboardCheck className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">
        {actionLabel}
      </Button>
    </div>
  )
}

export function ActiveOrderPlacementsSection({
  records,
  meta,
  page,
  limit,
  loading,
  draftFilters,
  activeFilters,
  loadBuyerOptions,
  loadJobOptions,
  loadCurrencyOptions,
  loadSupplierOptions,
  onDraftFiltersChange,
  onActiveFiltersChange,
  onPageChange,
  onLimitChange,
  onCreate,
  onEdit,
  onDelete,
  onResetFilters,
  canCreate,
  canUpdate,
  canDelete,
}: ActiveOrderPlacementsSectionProps) {
  const [selectedBuyer, setSelectedBuyer] = useState<AppComboboxOption | null>(null)
  const [selectedJob, setSelectedJob] = useState<AppComboboxOption | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<AppComboboxOption | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<AppComboboxOption | null>(null)
  const filterBuyerValue = draftFilters.buyerId && selectedBuyer?.value === draftFilters.buyerId ? selectedBuyer : null
  const filterJobValue = draftFilters.jobId && selectedJob?.value === draftFilters.jobId ? selectedJob : null
  const filterCurrencyValue = draftFilters.currencyId && selectedCurrency?.value === draftFilters.currencyId ? selectedCurrency : null
  const filterSupplierValue = draftFilters.factoryId && selectedSupplier?.value === draftFilters.factoryId ? selectedSupplier : null

  const filterCount = useMemo(
    () => [draftFilters.buyerId, draftFilters.jobId, draftFilters.currencyId, draftFilters.factoryId, draftFilters.placementDate, draftFilters.isPlaced, draftFilters.pono].filter((value) => value.trim()).length,
    [draftFilters],
  )
  const filtersActive = Boolean(activeFilters.buyerId || activeFilters.jobId || activeFilters.currencyId || activeFilters.factoryId || activeFilters.placementDate || activeFilters.isPlaced || activeFilters.pono)
  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No order placements found"
    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<OrderPlacementRecord>[]>(
    () => [
      {
        id: "job",
        header: "Job",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="whitespace-nowrap text-xs font-semibold">{getJobLabel(row.original)}</p>
            <p className="max-w-56 truncate text-[11px] text-slate-500 dark:text-slate-400">PO: {getPoLabel(row.original)}</p>
          </div>
        ),
      },
      { id: "buyer", header: "Buyer", cell: ({ row }) => <span className="text-xs font-medium">{getBuyerLabel(row.original)}</span> },
      { id: "factory", header: "Factory", cell: ({ row }) => <span className="text-xs font-medium">{getSupplierLabel(row.original)}</span> },
      { id: "currency", header: "Currency", cell: ({ row }) => <span className="text-xs">{getCurrencyLabel(row.original)}</span> },
      { id: "placementDate", header: "Placement Date", cell: ({ row }) => <span className="text-xs">{formatDate(row.original.placementDate)}</span> },
      { id: "quantity", header: "Qty", cell: ({ row }) => <span className="text-xs">{formatNumber(sumQuantity(row.original))}</span> },
      { id: "factoryFob", header: "Factory FOB", cell: ({ row }) => <span className="text-xs">{formatNumber(sumFactoryFob(row.original))}</span> },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.isPlaced ? "secondary" : "outline"} className="rounded-full px-3 py-1">
            {row.original.isPlaced ? "Placed" : "Draft"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const record = row.original
          return (
            <div className="pr-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm">
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {canUpdate ? <DropdownMenuItem onSelect={() => onEdit(record.id)}>Edit</DropdownMenuItem> : null}
                  {canUpdate && canDelete ? <DropdownMenuSeparator /> : null}
                  {canDelete ? <DropdownMenuItem variant="destructive" onSelect={() => onDelete(record)}>Delete</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [canDelete, canUpdate, onDelete, onEdit],
  )

  const table = useReactTable({ data: records, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Order placements</CardTitle>
            <CardDescription>{pageSummary}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}</Badge>
            <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">{filterCount} active filter{filterCount === 1 ? "" : "s"}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-0 sm:px-2">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onActiveFiltersChange(draftFilters)
            onPageChange(1)
          }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7"
        >
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterPlacementPo" className="text-xs font-medium text-slate-700 dark:text-slate-300">PO Number</label>
            <Input id="filterPlacementPo" value={draftFilters.pono} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDraftFiltersChange({ ...draftFilters, pono: event.target.value })} placeholder="Input PO number" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterPlacementBuyer" className="text-xs font-medium text-slate-700 dark:text-slate-300">Buyer</label>
            <AppCombobox value={filterBuyerValue} onValueChange={(buyer) => { setSelectedBuyer(buyer); onDraftFiltersChange({ ...draftFilters, buyerId: buyer?.value ?? "" }) }} loadItems={loadBuyerOptions} inputProps={{ id: "filterPlacementBuyer" }} placeholder="All buyers" showClear={Boolean(draftFilters.buyerId)} inputClassName="h-7 rounded-md px-2 text-xs" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterPlacementJob" className="text-xs font-medium text-slate-700 dark:text-slate-300">Job</label>
            <AppCombobox value={filterJobValue} onValueChange={(job) => { setSelectedJob(job); onDraftFiltersChange({ ...draftFilters, jobId: job?.value ?? "" }) }} loadItems={loadJobOptions} inputProps={{ id: "filterPlacementJob" }} placeholder="All jobs" showClear={Boolean(draftFilters.jobId)} inputClassName="h-7 rounded-md px-2 text-xs" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterPlacementCurrency" className="text-xs font-medium text-slate-700 dark:text-slate-300">Currency</label>
            <AppCombobox value={filterCurrencyValue} onValueChange={(currency) => { setSelectedCurrency(currency); onDraftFiltersChange({ ...draftFilters, currencyId: currency?.value ?? "" }) }} loadItems={loadCurrencyOptions} inputProps={{ id: "filterPlacementCurrency" }} placeholder="All currencies" showClear={Boolean(draftFilters.currencyId)} inputClassName="h-7 rounded-md px-2 text-xs" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterPlacementSupplier" className="text-xs font-medium text-slate-700 dark:text-slate-300">Factory</label>
            <AppCombobox value={filterSupplierValue} onValueChange={(supplier) => { setSelectedSupplier(supplier); onDraftFiltersChange({ ...draftFilters, factoryId: supplier?.value ?? "" }) }} loadItems={loadSupplierOptions} inputProps={{ id: "filterPlacementSupplier" }} placeholder="All factories" showClear={Boolean(draftFilters.factoryId)} inputClassName="h-7 rounded-md px-2 text-xs" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterPlacementDate" className="text-xs font-medium text-slate-700 dark:text-slate-300">Placement Date</label>
            <Input id="filterPlacementDate" type="date" value={draftFilters.placementDate} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDraftFiltersChange({ ...draftFilters, placementDate: event.target.value })} />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterPlacementStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
            <AppSelect triggerId="filterPlacementStatus" value={draftFilters.isPlaced || ALL_STATUS_VALUE} onValueChange={(value) => onDraftFiltersChange({ ...draftFilters, isPlaced: value === ALL_STATUS_VALUE ? "" : value })} placeholder="All statuses" options={[{ value: ALL_STATUS_VALUE, label: "All statuses" }, { value: "true", label: "Placed" }, { value: "false", label: "Draft" }]} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-7 xl:justify-self-end">
            <Button type="submit" className="w-full rounded-xl sm:w-auto"><Search className="size-3.5" /> Search</Button>
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={onResetFilters}>Reset</Button>
            {canCreate ? <Button type="button" onClick={onCreate} className="w-full rounded-xl sm:w-auto"><Plus className="size-3.5" /> New placement</Button> : null}
          </div>
        </form>
      </CardContent>

      <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}</div>
          ) : records.length > 0 ? (
            <div className="space-y-3 p-4">
              {records.map((record) => (
                <article key={record.id} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{getJobLabel(record)}</p>
                      <p className="mt-1 truncate text-xs font-medium text-slate-600 dark:text-slate-300">PO: {getPoLabel(record)}</p>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{getSupplierLabel(record)}</p>
                    </div>
                    {canUpdate || canDelete ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="rounded-full"><MoreHorizontal className="size-3.5" /><span className="sr-only">Open actions</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {canUpdate ? <DropdownMenuItem onSelect={() => onEdit(record.id)}>Edit</DropdownMenuItem> : null}
                          {canUpdate && canDelete ? <DropdownMenuSeparator /> : null}
                          {canDelete ? <DropdownMenuItem variant="destructive" onSelect={() => onDelete(record)}>Delete</DropdownMenuItem> : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={record.isPlaced ? "secondary" : "outline"} className="rounded-full px-3 py-1">{record.isPlaced ? "Placed" : "Draft"}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">{getBuyerLabel(record)}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">{getCurrencyLabel(record)}</Badge>
                  </div>
                  <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <p>Placement: {formatDate(record.placementDate)}</p>
                    <p>Qty: {formatNumber(sumQuantity(record))}</p>
                    <p>Factory FOB: {formatNumber(sumFactoryFob(record))}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState title="No order placements found" description={filtersActive ? "Try clearing or relaxing the current filters." : canCreate ? "Create the first placement to get started." : "No order placement records are available for the selected organization."} actionLabel={filtersActive || !canCreate ? "Reset filters" : "New placement"} onAction={filtersActive || !canCreate ? onResetFilters : onCreate} />
            </div>
          )}
          <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">{pageSummary}</p>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(1)} disabled={loading || page <= 1}><ChevronsLeft className="size-3.5" /></Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.max(1, current - 1))} disabled={loading || page <= 1}><ChevronLeft className="size-3.5" /></Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.min(meta?.totalPages ?? 1, current + 1))} disabled={loading || page >= (meta?.totalPages ?? 1)}><ChevronRight className="size-3.5" /></Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(meta?.totalPages ?? 1)} disabled={loading || page >= (meta?.totalPages ?? 1)}><ChevronsRight className="size-3.5" /></Button>
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <AppDataTable table={table} pageSummary={pageSummary} page={page} totalPages={meta?.totalPages ?? 1} pageSize={limit} isLoading={loading} pageSizeOptions={[10, 25, 50, 100]} leadingColumnIds={["job"]} onPageChange={(nextPage) => onPageChange(nextPage)} onPageSizeChange={(nextPageSize) => onLimitChange(nextPageSize)} emptyState={<EmptyState title="No order placements found" description={filtersActive ? "Try clearing or relaxing the current filters." : canCreate ? "Create the first placement to get started." : "No order placement records are available for the selected organization."} actionLabel={filtersActive || !canCreate ? "Reset filters" : "New placement"} onAction={filtersActive || !canCreate ? onResetFilters : onCreate} />} />
        </div>
      </CardContent>
    </Card>
  )
}
