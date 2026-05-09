"use client"

import { useMemo, useState } from "react"

import { MoreHorizontal, Search } from "lucide-react"
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

type DeletedTnaSectionProps = {
  deletedRecords: TnaRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeletedRecords: boolean
  deletedError: string
  deletedDraftFilters: TnaFilterValues
  deletedActiveFilters: TnaFilterValues
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadJobOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  onDeletedDraftFiltersChange: (nextValues: TnaFilterValues) => void
  onDeletedActiveFiltersChange: (nextValues: TnaFilterValues) => void
  onDeletedPageChange: (nextPage: number) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (record: TnaRecord, mode: "restore" | "permanent") => void
  canRestoreTna: boolean
  canPermanentlyDeleteTna: boolean
}

function getBuyerLabel(buyer?: BuyerSummary | null) {
  return buyer?.displayName?.trim() || buyer?.name?.trim() || "No buyer"
}

function getJobLabel(job?: JobSummary | null) {
  return job?.jobNo?.trim() || "No job"
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10)
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(parsed)
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <MoreHorizontal className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  )
}

export function DeletedTnaSection({
  deletedRecords,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeletedRecords,
  deletedError,
  deletedDraftFilters,
  deletedActiveFilters,
  loadBuyerOptions,
  loadJobOptions,
  onDeletedDraftFiltersChange,
  onDeletedActiveFiltersChange,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  canRestoreTna,
  canPermanentlyDeleteTna,
}: DeletedTnaSectionProps) {
  const [selectedBuyer, setSelectedBuyer] = useState<AppComboboxOption | null>(null)
  const [selectedJob, setSelectedJob] = useState<AppComboboxOption | null>(null)

  const filterBuyerValue = deletedDraftFilters.buyerId && selectedBuyer?.value === deletedDraftFilters.buyerId ? selectedBuyer : null
  const filterJobValue = deletedDraftFilters.jobId && selectedJob?.value === deletedDraftFilters.jobId ? selectedJob : null

  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) return "No deleted TNA records found"
    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedFilterCount = useMemo(
    () => [deletedDraftFilters.buyerId, deletedDraftFilters.jobId].filter((value) => value.trim()).length,
    [deletedDraftFilters],
  )

  const deletedFiltersActive = Boolean(deletedActiveFilters.buyerId || deletedActiveFilters.jobId)

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
      id: "deleted",
      header: "Deleted",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(row.original.deleted_at)}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{row.original.deleted_by_user?.name?.trim() || row.original.deleted_by_id || "Deleted item"}</p>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="pr-4">Actions</span>,
      cell: ({ row }) => {
        const record = row.original
        const hasActions = canRestoreTna || canPermanentlyDeleteTna

        if (!hasActions) {
          return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>
        }

        return (
          <div className="pr-4 text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                  <MoreHorizontal className="size-3.5" />
                  <span className="sr-only">Open deleted TNA actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canRestoreTna ? <DropdownMenuItem onSelect={() => onOpenAction(record, "restore")}>Restore TNA</DropdownMenuItem> : null}
                {canRestoreTna && canPermanentlyDeleteTna ? <DropdownMenuSeparator /> : null}
                {canPermanentlyDeleteTna ? <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(record, "permanent")}>Delete permanently</DropdownMenuItem> : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [canPermanentlyDeleteTna, canRestoreTna, onOpenAction])

  const table = useReactTable({
    data: deletedRecords,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Deleted TNA</CardTitle>
            <CardDescription>{deletedPageSummary}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">{deletedMeta?.total ?? deletedRecords.length} deleted</Badge>
            <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">{deletedFilterCount} active filter{deletedFilterCount === 1 ? "" : "s"}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-0 sm:px-2">
        <form onSubmit={(event) => { event.preventDefault(); onDeletedActiveFiltersChange(deletedDraftFilters); onDeletedPageChange(1) }} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="min-w-0 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Buyer</label>
            <AppCombobox
              value={filterBuyerValue}
              onValueChange={(buyer) => {
                setSelectedBuyer(buyer)
                onDeletedDraftFiltersChange({ ...deletedDraftFilters, buyerId: buyer?.value ?? "" })
              }}
              loadItems={loadBuyerOptions}
              initialLimit={10}
              searchLimit={10}
              placeholder="All buyers"
              loadingMessage="Loading buyers..."
              emptyMessage="No buyers match your search."
              showClear={Boolean(deletedDraftFilters.buyerId)}
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
                onDeletedDraftFiltersChange({ ...deletedDraftFilters, jobId: job?.value ?? "" })
              }}
              loadItems={loadJobOptions}
              initialLimit={10}
              searchLimit={10}
              placeholder="All jobs"
              loadingMessage="Loading jobs..."
              emptyMessage="No jobs match your search."
              showClear={Boolean(deletedDraftFilters.jobId)}
              inputClassName="h-7 rounded-md px-2 text-xs"
              contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-4">
            <Button type="submit" className="w-full rounded-xl sm:w-auto">
              <Search className="size-3.5" />
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl sm:w-auto"
              onClick={() => {
                const cleared: TnaFilterValues = { buyerId: "", jobId: "" }
                setSelectedBuyer(null)
                setSelectedJob(null)
                onDeletedDraftFiltersChange(cleared)
                onDeletedActiveFiltersChange(cleared)
                onDeletedPageChange(1)
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </CardContent>

      <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
        {deletedError ? (
          <div className="p-4">
            <EmptyState title="Unable to load deleted TNA" description={deletedError} />
          </div>
        ) : null}

        {!deletedError ? (
          <>
            <div className="hidden lg:block">
              <AppDataTable
                table={table}
                pageSummary={deletedPageSummary}
                page={deletedPage}
                totalPages={deletedMeta?.totalPages ?? 1}
                pageSize={deletedLimit}
                isLoading={loadingDeletedRecords}
                pageSizeOptions={[5, 10, 25, 50]}
                leadingColumnIds={["tna"]}
                onPageChange={(nextPage) => onDeletedPageChange(nextPage)}
                onPageSizeChange={(nextPageSize) => {
                  onDeletedLimitChange(nextPageSize)
                  onDeletedPageChange(1)
                }}
                emptyState={
                  <EmptyState
                    title="No deleted TNA records found"
                    description={deletedFiltersActive ? "Try clearing or relaxing the current filters." : "Soft deleted TNA records will appear here when users remove them."}
                  />
                }
              />
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {loadingDeletedRecords ? (
                Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)
              ) : deletedRecords.length > 0 ? (
                deletedRecords.map((record) => (
                  <article key={record.id} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{getBuyerLabel(record.buyer)}</p>
                        <p className="mt-1 truncate text-xs font-medium text-slate-600 dark:text-slate-300">{getJobLabel(record.job)}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Lead time: {Number(record.leadTime ?? 0)}</p>
                      </div>

                      {canRestoreTna || canPermanentlyDeleteTna ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                              <MoreHorizontal className="size-3.5" />
                              <span className="sr-only">Open deleted TNA actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {canRestoreTna ? <DropdownMenuItem onSelect={() => onOpenAction(record, "restore")}>Restore TNA</DropdownMenuItem> : null}
                            {canRestoreTna && canPermanentlyDeleteTna ? <DropdownMenuSeparator /> : null}
                            {canPermanentlyDeleteTna ? <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(record, "permanent")}>Delete permanently</DropdownMenuItem> : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="destructive" className="rounded-full px-3 py-1">Deleted</Badge>
                      <Badge variant="outline" className="rounded-full px-3 py-1">{formatDate(record.deleted_at)}</Badge>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState
                  title="No deleted TNA records found"
                  description={deletedFiltersActive ? "Try clearing or relaxing the current filters." : "Soft deleted TNA records will appear here when users remove them."}
                />
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

