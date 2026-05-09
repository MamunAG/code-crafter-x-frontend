"use client"

import { useMemo, useState } from "react"

import { MoreHorizontal, Plus, Search } from "lucide-react"
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table"

import { AppCombobox, type AppComboboxLoadParams, type AppComboboxLoadResult, type AppComboboxOption } from "@/components/app-combobox"
import { AppDataTable } from "@/components/app-data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import type { BuyerSummary, JobSummary, PaginationMeta, TnaFilterValues, TnaRecord } from "../tna.types"

type ActiveTnaSectionProps = {
  records: TnaRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loadingRecords: boolean
  draftFilters: TnaFilterValues
  activeFilters: TnaFilterValues
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadJobOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  onDraftFiltersChange: (nextValues: TnaFilterValues) => void
  onActiveFiltersChange: (nextValues: TnaFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreateTna: () => void
  onEditTna: (id: string) => void
  onDeleteTna: (record: TnaRecord) => void
  onResetFilters: () => void
  canCreateTna: boolean
  canUpdateTna: boolean
  canDeleteTna: boolean
}

function getBuyerLabel(buyer?: BuyerSummary | null) {
  return buyer?.displayName?.trim() || buyer?.name?.trim() || "No buyer"
}

function getJobLabel(job?: JobSummary | null) {
  return job?.jobNo?.trim() || "No job"
}

function getTaskCount(record: TnaRecord) {
  return record.tnaDetails?.length ?? 0
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10)
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(parsed)
}

function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <Plus className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">{actionLabel}</Button>
    </div>
  )
}

export function ActiveTnaSection({
  records,
  meta,
  page,
  limit,
  loadingRecords,
  draftFilters,
  activeFilters,
  loadBuyerOptions,
  loadJobOptions,
  onDraftFiltersChange,
  onActiveFiltersChange,
  onPageChange,
  onLimitChange,
  onCreateTna,
  onEditTna,
  onDeleteTna,
  onResetFilters,
  canCreateTna,
  canUpdateTna,
  canDeleteTna,
}: ActiveTnaSectionProps) {
  const [selectedBuyer, setSelectedBuyer] = useState<AppComboboxOption | null>(null)
  const [selectedJob, setSelectedJob] = useState<AppComboboxOption | null>(null)

  const filterBuyerValue = draftFilters.buyerId && selectedBuyer?.value === draftFilters.buyerId ? selectedBuyer : null
  const filterJobValue = draftFilters.jobId && selectedJob?.value === draftFilters.jobId ? selectedJob : null

  const filterCount = useMemo(
    () => [draftFilters.buyerId, draftFilters.jobId].filter((value) => value.trim()).length,
    [draftFilters],
  )

  const filtersActive = Boolean(activeFilters.buyerId || activeFilters.jobId)

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No TNA records found"
    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<TnaRecord>[]>(() => [
    {
      id: "tna",
      header: "TNA",
      cell: ({ row }) => (
        <div className="pl-4">
          <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{getBuyerLabel(row.original.buyer)}</p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">Job: {getJobLabel(row.original.job)}</p>
        </div>
      ),
    },
    {
      id: "leadTime",
      header: "Lead Time",
      cell: ({ row }) => <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{Number(row.original.leadTime ?? 0)}</span>,
    },
    {
      id: "details",
      header: "Details",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="text-xs text-slate-700 dark:text-slate-200">{getTaskCount(row.original)} task row{getTaskCount(row.original) === 1 ? "" : "s"}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{row.original.tnaDetails?.[0]?.relationFormula ?? "No formula"}</p>
        </div>
      ),
    },
    {
      id: "created",
      header: "Created",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(row.original.created_at)}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{row.original.created_by_user?.name?.trim() || row.original.created_by_id || "No creator metadata"}</p>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="pr-4">Actions</span>,
      cell: ({ row }) => {
        const record = row.original
        const hasActions = canUpdateTna || canDeleteTna

        if (!hasActions) {
          return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>
        }

        return (
          <div className="pr-4 text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                  <MoreHorizontal className="size-3.5" />
                  <span className="sr-only">Open actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canUpdateTna ? <DropdownMenuItem onSelect={() => onEditTna(record.id)}>Edit TNA</DropdownMenuItem> : null}
                {canUpdateTna && canDeleteTna ? <DropdownMenuSeparator /> : null}
                {canDeleteTna ? <DropdownMenuItem variant="destructive" onSelect={() => onDeleteTna(record)}>Delete TNA</DropdownMenuItem> : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [canDeleteTna, canUpdateTna, onDeleteTna, onEditTna])

  const table = useReactTable({ data: records, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Active TNA</CardTitle>
            <CardDescription>{pageSummary}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}</Badge>
            <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">{filterCount} active filter{filterCount === 1 ? "" : "s"}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-0 sm:px-2">
        <form onSubmit={(event) => { event.preventDefault(); onActiveFiltersChange(draftFilters); onPageChange(1) }} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="min-w-0 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Buyer</label>
            <AppCombobox
              value={filterBuyerValue}
              onValueChange={(buyer) => {
                setSelectedBuyer(buyer)
                onDraftFiltersChange({ ...draftFilters, buyerId: buyer?.value ?? "" })
              }}
              loadItems={loadBuyerOptions}
              initialLimit={10}
              searchLimit={10}
              placeholder="All buyers"
              loadingMessage="Loading buyers..."
              emptyMessage="No buyers match your search."
              showClear={Boolean(draftFilters.buyerId)}
              inputClassName="h-7 rounded-md px-2 text-xs"
              contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
            />
          </div>

          <div className="min-w-0 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Job</label>
            <AppCombobox
              value={filterJobValue}
              onValueChange={(job) => {
                setSelectedJob(job)
                onDraftFiltersChange({ ...draftFilters, jobId: job?.value ?? "" })
              }}
              loadItems={loadJobOptions}
              initialLimit={10}
              searchLimit={10}
              placeholder="All jobs"
              loadingMessage="Loading jobs..."
              emptyMessage="No jobs match your search."
              showClear={Boolean(draftFilters.jobId)}
              inputClassName="h-7 rounded-md px-2 text-xs"
              contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-4">
            <Button type="submit" className="w-full rounded-xl sm:w-auto">
              <Search className="size-3.5" />
              Search
            </Button>
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={onResetFilters}>
              Reset
            </Button>
            {canCreateTna ? (
              <Button type="button" onClick={onCreateTna} className="w-full rounded-xl sm:w-auto">
                <Plus className="size-3.5" />
                New TNA
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>

      <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
        <div className="hidden lg:block">
          <AppDataTable
            table={table}
            pageSummary={pageSummary}
            page={page}
            totalPages={meta?.totalPages ?? 1}
            pageSize={limit}
            isLoading={loadingRecords}
            pageSizeOptions={[10, 25, 50, 100]}
            leadingColumnIds={["tna"]}
            onPageChange={(nextPage) => onPageChange(nextPage)}
            onPageSizeChange={(nextPageSize) => onLimitChange(nextPageSize)}
            emptyState={
              <EmptyState
                title="No TNA records found"
                description={filtersActive ? "Try clearing or relaxing the current filters." : "Create the first TNA record to get started."}
                actionLabel={filtersActive ? "Reset filters" : "New TNA"}
                onAction={filtersActive ? onResetFilters : onCreateTna}
              />
            }
          />
        </div>

        <div className="space-y-3 p-4 lg:hidden">
          {loadingRecords ? (
            Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)
          ) : records.length > 0 ? (
            records.map((record) => (
              <article key={record.id} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{getBuyerLabel(record.buyer)}</p>
                    <p className="mt-1 truncate text-xs font-medium text-slate-600 dark:text-slate-300">{getJobLabel(record.job)}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Lead time: {Number(record.leadTime ?? 0)}</p>
                  </div>

                  {canUpdateTna || canDeleteTna ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                          <MoreHorizontal className="size-3.5" />
                          <span className="sr-only">Open actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {canUpdateTna ? <DropdownMenuItem onSelect={() => onEditTna(record.id)}>Edit TNA</DropdownMenuItem> : null}
                        {canUpdateTna && canDeleteTna ? <DropdownMenuSeparator /> : null}
                        {canDeleteTna ? <DropdownMenuItem variant="destructive" onSelect={() => onDeleteTna(record)}>Delete TNA</DropdownMenuItem> : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">{getTaskCount(record)} task row{getTaskCount(record) === 1 ? "" : "s"}</Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">{record.tnaDetails?.[0]?.relationFormula ?? "No formula"}</Badge>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              title="No TNA records found"
              description={filtersActive ? "Try clearing or relaxing the current filters." : "Create the first TNA record to get started."}
              actionLabel={filtersActive ? "Reset filters" : "New TNA"}
              onAction={filtersActive ? onResetFilters : onCreateTna}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

