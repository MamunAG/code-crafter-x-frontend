/* eslint-disable react-hooks/incompatible-library */
"use client"

import { useMemo, useState } from "react"
import {
  BriefcaseBusiness,
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

import {
  AppCombobox,
  type AppComboboxLoadParams,
  type AppComboboxLoadResult,
  type AppComboboxOption,
} from "@/components/app-combobox"
import { AppDataTable } from "@/components/app-data-table"
import { AppSelect } from "@/components/app-select"
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

import type { JobFilterValues, JobRecord, PaginationMeta } from "../job.types"

const ALL_STATUS_VALUE = "__all_deleted_job_statuses__"
const ALL_ORDER_TYPE_VALUE = "__all_deleted_job_order_types__"

type DeletedJobsSectionProps = {
  deletedJobs: JobRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeletedJobs: boolean
  deletedError: string
  deletedDraftFilters: JobFilterValues
  deletedActiveFilters: JobFilterValues
  loadFactoryOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadEmployeeOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  onDeletedDraftFiltersChange: (nextValues: JobFilterValues) => void
  onDeletedActiveFiltersChange: (nextValues: JobFilterValues) => void
  onDeletedPageChange: (nextPage: number) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (job: JobRecord, mode: "restore" | "permanent") => void
  canRestoreJob: boolean
  canPermanentlyDeleteJob: boolean
}

function getFactoryLabel(job: JobRecord) {
  return job.factory?.displayName?.trim() || job.factory?.name?.trim() || "No factory"
}

function getBuyerLabel(job: JobRecord) {
  return job.buyer?.displayName?.trim() || job.buyer?.name?.trim() || "No buyer"
}

function getPoLabel(job: JobRecord) {
  const values = (job.jobDetails ?? [])
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
        <BriefcaseBusiness className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  )
}

export function DeletedJobsSection({
  deletedJobs,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeletedJobs,
  deletedError,
  deletedDraftFilters,
  deletedActiveFilters,
  loadFactoryOptions,
  loadBuyerOptions,
  loadEmployeeOptions,
  onDeletedDraftFiltersChange,
  onDeletedActiveFiltersChange,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  canRestoreJob,
  canPermanentlyDeleteJob,
}: DeletedJobsSectionProps) {
  const [selectedFilterFactory, setSelectedFilterFactory] = useState<AppComboboxOption | null>(null)
  const [selectedFilterBuyer, setSelectedFilterBuyer] = useState<AppComboboxOption | null>(null)
  const [selectedFilterMerchandiser, setSelectedFilterMerchandiser] = useState<AppComboboxOption | null>(null)
  const filterFactoryValue =
    deletedDraftFilters.factoryId && selectedFilterFactory?.value === deletedDraftFilters.factoryId
      ? selectedFilterFactory
      : null
  const filterBuyerValue =
    deletedDraftFilters.buyerId && selectedFilterBuyer?.value === deletedDraftFilters.buyerId
      ? selectedFilterBuyer
      : null
  const filterMerchandiserValue =
    deletedDraftFilters.merchandiserId && selectedFilterMerchandiser?.value === deletedDraftFilters.merchandiserId
      ? selectedFilterMerchandiser
      : null

  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) return "No deleted jobs found"
    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedFilterCount = useMemo(
    () =>
      [
        deletedDraftFilters.factoryId,
        deletedDraftFilters.buyerId,
        deletedDraftFilters.merchandiserId,
        deletedDraftFilters.ordertype,
        deletedDraftFilters.pono,
        deletedDraftFilters.isActive,
      ].filter((value) => value.trim()).length,
    [deletedDraftFilters],
  )

  const deletedFiltersActive = Boolean(
    deletedActiveFilters.factoryId ||
      deletedActiveFilters.buyerId ||
      deletedActiveFilters.merchandiserId ||
      deletedActiveFilters.ordertype ||
      deletedActiveFilters.pono ||
      deletedActiveFilters.isActive,
  )

  const columns = useMemo<ColumnDef<JobRecord>[]>(
    () => [
      {
        id: "job",
        header: "Job",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{row.original.jobNo || "No job no"}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">PO: {getPoLabel(row.original)}</p>
          </div>
        ),
      },
      {
        id: "factory",
        header: "Factory",
        cell: ({ row }) => <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{getFactoryLabel(row.original)}</span>,
      },
      {
        id: "buyer",
        header: "Buyer",
        cell: ({ row }) => <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{getBuyerLabel(row.original)}</span>,
      },
      {
        id: "details",
        header: "Details",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-xs text-slate-700 dark:text-slate-200">Qty {Number(row.original.totalPoQty ?? 0)}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{row.original.jobDetails?.length ?? 0} detail row{(row.original.jobDetails?.length ?? 0) === 1 ? "" : "s"}</p>
          </div>
        ),
      },
      {
        id: "deleted",
        header: "Deleted",
        cell: ({ row }) => {
          const job = row.original
          const deletedBy = getUserLabel(job.deleted_by_user, job.deleted_by_id)

          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(job.deleted_at)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{deletedBy ? `Deleted by ${deletedBy}` : "Deleted item"}</p>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const job = row.original
          const hasActions = canRestoreJob || canPermanentlyDeleteJob

          if (!hasActions) {
            return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>
          }

          return (
            <div className="pr-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open deleted job actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canRestoreJob ? <DropdownMenuItem onSelect={() => onOpenAction(job, "restore")}>Restore job</DropdownMenuItem> : null}
                  {canRestoreJob && canPermanentlyDeleteJob ? <DropdownMenuSeparator /> : null}
                  {canPermanentlyDeleteJob ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(job, "permanent")}>
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
    [canPermanentlyDeleteJob, canRestoreJob, onOpenAction],
  )

  const table = useReactTable({
    data: deletedJobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  function resetFilters() {
    const cleared: JobFilterValues = {
      factoryId: "",
      buyerId: "",
      merchandiserId: "",
      ordertype: "",
      pono: "",
      isActive: "",
    }
    setSelectedFilterFactory(null)
    setSelectedFilterBuyer(null)
    setSelectedFilterMerchandiser(null)
    onDeletedDraftFiltersChange(cleared)
    onDeletedActiveFiltersChange(cleared)
    onDeletedPageChange(1)
  }

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Deleted jobs</CardTitle>
            <CardDescription>{deletedPageSummary}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              {deletedMeta?.total ?? deletedJobs.length} deleted
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
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
        >
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedJobPo" className="text-xs font-medium text-slate-700 dark:text-slate-300">PO Number</label>
            <Input
              id="deletedJobPo"
              value={deletedDraftFilters.pono}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, pono: event.target.value })}
              placeholder="Input PO number"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedJobFactory" className="text-xs font-medium text-slate-700 dark:text-slate-300">Factory</label>
            <AppCombobox
              value={filterFactoryValue}
              onValueChange={(factory) => {
                setSelectedFilterFactory(factory)
                onDeletedDraftFiltersChange({ ...deletedDraftFilters, factoryId: factory?.value ?? "" })
              }}
              loadItems={loadFactoryOptions}
              initialLimit={10}
              searchLimit={10}
              inputProps={{ id: "deletedJobFactory" }}
              placeholder="All factories"
              loadingMessage="Loading factories..."
              emptyMessage="No factories match your search."
              showClear={Boolean(deletedDraftFilters.factoryId)}
              inputClassName="h-7 rounded-md px-2 text-xs"
              contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedJobBuyer" className="text-xs font-medium text-slate-700 dark:text-slate-300">Buyer</label>
            <AppCombobox
              value={filterBuyerValue}
              onValueChange={(buyer) => {
                setSelectedFilterBuyer(buyer)
                onDeletedDraftFiltersChange({ ...deletedDraftFilters, buyerId: buyer?.value ?? "" })
              }}
              loadItems={loadBuyerOptions}
              initialLimit={10}
              searchLimit={10}
              inputProps={{ id: "deletedJobBuyer" }}
              placeholder="All buyers"
              loadingMessage="Loading buyers..."
              emptyMessage="No buyers match your search."
              showClear={Boolean(deletedDraftFilters.buyerId)}
              inputClassName="h-7 rounded-md px-2 text-xs"
              contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedJobMerchandiser" className="text-xs font-medium text-slate-700 dark:text-slate-300">Merchandiser</label>
            <AppCombobox
              value={filterMerchandiserValue}
              onValueChange={(merchandiser) => {
                setSelectedFilterMerchandiser(merchandiser)
                onDeletedDraftFiltersChange({ ...deletedDraftFilters, merchandiserId: merchandiser?.value ?? "" })
              }}
              loadItems={loadEmployeeOptions}
              initialLimit={10}
              searchLimit={10}
              inputProps={{ id: "deletedJobMerchandiser" }}
              placeholder="All merchandisers"
              loadingMessage="Loading merchandisers..."
              emptyMessage="No merchandisers match your search."
              showClear={Boolean(deletedDraftFilters.merchandiserId)}
              inputClassName="h-7 rounded-md px-2 text-xs"
              contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedJobOrderType" className="text-xs font-medium text-slate-700 dark:text-slate-300">Order Type</label>
            <AppSelect
              triggerId="deletedJobOrderType"
              value={deletedDraftFilters.ordertype || ALL_ORDER_TYPE_VALUE}
              onValueChange={(value) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, ordertype: value === ALL_ORDER_TYPE_VALUE ? "" : value })}
              placeholder="All order types"
              options={[
                { value: ALL_ORDER_TYPE_VALUE, label: "All order types" },
                { value: "Retail", label: "Retail" },
                { value: "Promotional", label: "Promotional" },
              ]}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedJobStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
            <AppSelect
              triggerId="deletedJobStatus"
              value={deletedDraftFilters.isActive || ALL_STATUS_VALUE}
              onValueChange={(value) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, isActive: value === ALL_STATUS_VALUE ? "" : value })}
              placeholder="All statuses"
              options={[
                { value: ALL_STATUS_VALUE, label: "All statuses" },
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-6 xl:justify-self-end">
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
            <EmptyState title="Unable to load deleted jobs" description={deletedError} />
          </div>
        ) : null}

        {!deletedError ? (
          <>
            <div className="lg:hidden">
              {loadingDeletedJobs ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-2xl" />
                  ))}
                </div>
              ) : deletedJobs.length > 0 ? (
                <div className="space-y-3 p-4">
                  {deletedJobs.map((job) => {
                    const deletedBy = getUserLabel(job.deleted_by_user, job.deleted_by_id)

                    return (
                      <article
                        key={job.id}
                        className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{job.jobNo || "No job no"}</p>
                            <p className="mt-1 truncate text-xs font-medium text-slate-600 dark:text-slate-300">PO: {getPoLabel(job)}</p>
                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{getFactoryLabel(job)}</p>
                          </div>

                          {canRestoreJob || canPermanentlyDeleteJob ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                                  <MoreHorizontal className="size-3.5" />
                                  <span className="sr-only">Open deleted job actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                {canRestoreJob ? <DropdownMenuItem onSelect={() => onOpenAction(job, "restore")}>Restore job</DropdownMenuItem> : null}
                                {canRestoreJob && canPermanentlyDeleteJob ? <DropdownMenuSeparator /> : null}
                                {canPermanentlyDeleteJob ? (
                                  <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(job, "permanent")}>
                                    Delete permanently
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="destructive" className="rounded-full px-3 py-1">Deleted</Badge>
                          <Badge variant="outline" className="rounded-full px-3 py-1">{getBuyerLabel(job)}</Badge>
                          {job.ordertype ? <Badge variant="outline" className="rounded-full px-3 py-1">{job.ordertype}</Badge> : null}
                        </div>

                        <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p>Qty: {Number(job.totalPoQty ?? 0)}</p>
                          <p>Details: {job.jobDetails?.length ?? 0}</p>
                          <p>Deleted: {formatDate(job.deleted_at)}</p>
                          <p>{deletedBy ? `Deleted by ${deletedBy}` : "Deleted item"}</p>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState
                    title="No deleted jobs found"
                    description={
                      deletedFiltersActive
                        ? "Try clearing or relaxing the current filters."
                        : "Soft deleted jobs will appear here when users remove them."
                    }
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(1)} disabled={loadingDeletedJobs || deletedPage <= 1}>
                    <ChevronsLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.max(1, deletedPage - 1))} disabled={loadingDeletedJobs || deletedPage <= 1}>
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.min(deletedMeta?.totalPages ?? 1, deletedPage + 1))} disabled={loadingDeletedJobs || deletedPage >= (deletedMeta?.totalPages ?? 1)}>
                    <ChevronRight className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(deletedMeta?.totalPages ?? 1)} disabled={loadingDeletedJobs || deletedPage >= (deletedMeta?.totalPages ?? 1)}>
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
                isLoading={loadingDeletedJobs}
                pageSizeOptions={[5, 10, 25, 50]}
                leadingColumnIds={["job"]}
                onPageChange={(nextPage) => onDeletedPageChange(nextPage)}
                onPageSizeChange={(nextPageSize) => {
                  onDeletedLimitChange(nextPageSize)
                  onDeletedPageChange(1)
                }}
                emptyState={
                  <EmptyState
                    title="No deleted jobs found"
                    description={
                      deletedFiltersActive
                        ? "Try clearing or relaxing the current filters."
                        : "Soft deleted jobs will appear here when users remove them."
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
