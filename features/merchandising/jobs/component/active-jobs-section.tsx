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
  Plus,
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

import type { JobFilterValues, JobRecord, PaginationMeta } from "../job.types"

type ActiveJobsSectionProps = {
  jobs: JobRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loadingJobs: boolean
  draftFilters: JobFilterValues
  activeFilters: JobFilterValues
  loadFactoryOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadEmployeeOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  onDraftFiltersChange: (nextValues: JobFilterValues) => void
  onActiveFiltersChange: (nextValues: JobFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreateJob: () => void
  onEditJob: (jobId: string) => void
  onDeleteJob: (job: JobRecord) => void
  onResetFilters: () => void
  canCreateJob: boolean
  canUpdateJob: boolean
  canDeleteJob: boolean
}

const ALL_STATUS_VALUE = "__all_statuses__"
const ALL_ORDER_TYPE_VALUE = "__all_order_types__"

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

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10)
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(parsed)
}

function jobStatusTone(job?: JobRecord | null) {
  if (!job) return "outline" as const
  if (job.deleted_at) return "destructive" as const
  return job.isActive === false ? "outline" : "secondary"
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <BriefcaseBusiness className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">
        {actionLabel}
      </Button>
    </div>
  )
}

export function ActiveJobsSection({
  jobs,
  meta,
  page,
  limit,
  loadingJobs,
  draftFilters,
  activeFilters,
  loadFactoryOptions,
  loadBuyerOptions,
  loadEmployeeOptions,
  onDraftFiltersChange,
  onActiveFiltersChange,
  onPageChange,
  onLimitChange,
  onCreateJob,
  onEditJob,
  onDeleteJob,
  onResetFilters,
  canCreateJob,
  canUpdateJob,
  canDeleteJob,
}: ActiveJobsSectionProps) {
  const [selectedFilterFactory, setSelectedFilterFactory] = useState<AppComboboxOption | null>(null)
  const [selectedFilterBuyer, setSelectedFilterBuyer] = useState<AppComboboxOption | null>(null)
  const [selectedFilterMerchandiser, setSelectedFilterMerchandiser] = useState<AppComboboxOption | null>(null)
  const filterFactoryValue =
    draftFilters.factoryId && selectedFilterFactory?.value === draftFilters.factoryId
      ? selectedFilterFactory
      : null
  const filterBuyerValue =
    draftFilters.buyerId && selectedFilterBuyer?.value === draftFilters.buyerId
      ? selectedFilterBuyer
      : null
  const filterMerchandiserValue =
    draftFilters.merchandiserId && selectedFilterMerchandiser?.value === draftFilters.merchandiserId
      ? selectedFilterMerchandiser
      : null
  const filterCount = useMemo(
    () =>
      [
        draftFilters.factoryId,
        draftFilters.buyerId,
        draftFilters.merchandiserId,
        draftFilters.ordertype,
        draftFilters.pono,
        draftFilters.isActive,
      ].filter((value) => value.trim()).length,
    [draftFilters],
  )

  const filtersActive = Boolean(
    activeFilters.factoryId ||
      activeFilters.buyerId ||
      activeFilters.merchandiserId ||
      activeFilters.ordertype ||
      activeFilters.pono ||
      activeFilters.isActive,
  )

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No jobs found"
    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<JobRecord>[]>(
    () => [
      {
        id: "jobNo",
        header: "Job No",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="whitespace-nowrap text-xs font-semibold">{row.original.jobNo || "-"}</p>
          </div>
        ),
      },
      {
        id: "po",
        header: "PO",
        cell: ({ row }) => (
          <div>
            <p className="max-w-56 truncate text-xs font-semibold">{getPoLabel(row.original)}</p>
          </div>
        ),
      },
      {
        id: "factory",
        header: "Factory",
        cell: ({ row }) => (
          <span className="text-xs font-medium">{getFactoryLabel(row.original)}</span>
        ),
      },
      {
        id: "buyer",
        header: "Buyer",
        cell: ({ row }) => (
          <span className="text-xs font-medium">{getBuyerLabel(row.original)}</span>
        ),
      },
      {
        id: "orderType",
        header: "Order Type",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.ordertype ?? "-"}</span>
        ),
      },
      {
        id: "quantity",
        header: "Qty",
        cell: ({ row }) => (
          <span className="text-xs">{Number(row.original.totalPoQty ?? 0)}</span>
        ),
      },
      {
        id: "details",
        header: "Details",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.jobDetails?.length ?? 0}</span>
        ),
      },
      {
        id: "received",
        header: "Received",
        cell: ({ row }) => (
          <span className="text-xs">{formatDate(row.original.poReceiveDate)}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const job = row.original
          const label = job.deleted_at ? "Deleted" : job.isActive === false ? "Inactive" : "Active"

          return (
            <Badge variant={jobStatusTone(job)} className="rounded-full px-3 py-1">
              {label}
            </Badge>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const job = row.original
          const hasActions = canUpdateJob || canDeleteJob

          if (!hasActions) {
            return (
              <div className="pr-4 text-right text-xs text-slate-400">
                No actions
              </div>
            )
          }

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
                  {canUpdateJob ? (
                    <DropdownMenuItem onSelect={() => onEditJob(job.id)}>
                      Edit
                    </DropdownMenuItem>
                  ) : null}
                  {canUpdateJob && canDeleteJob ? <DropdownMenuSeparator /> : null}
                  {canDeleteJob ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => onDeleteJob(job)}>
                      Delete
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [canDeleteJob, canUpdateJob, onDeleteJob, onEditJob],
  )

  const table = useReactTable({
    data: jobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Jobs</CardTitle>
            <CardDescription>{pageSummary}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}
            </Badge>
            <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">
              {filterCount} active filter{filterCount === 1 ? "" : "s"}
            </Badge>
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
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
        >
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterJobPo" className="text-xs font-medium text-slate-700 dark:text-slate-300">PO Number</label>
            <Input
              id="filterJobPo"
              value={draftFilters.pono}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) => onDraftFiltersChange({ ...draftFilters, pono: event.target.value })}
              placeholder="Input PO number"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterJobFactory" className="text-xs font-medium text-slate-700 dark:text-slate-300">Factory</label>
            <AppCombobox
              value={filterFactoryValue}
              onValueChange={(factory) => {
                setSelectedFilterFactory(factory)
                onDraftFiltersChange({ ...draftFilters, factoryId: factory?.value ?? "" })
              }}
              loadItems={loadFactoryOptions}
              initialLimit={10}
              searchLimit={10}
              inputProps={{ id: "filterJobFactory" }}
              placeholder="All factories"
              loadingMessage="Loading factories..."
              emptyMessage="No factories match your search."
              showClear={Boolean(draftFilters.factoryId)}
              inputClassName="h-7 rounded-md px-2 text-xs"
              contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterJobBuyer" className="text-xs font-medium text-slate-700 dark:text-slate-300">Buyer</label>
            <AppCombobox
              value={filterBuyerValue}
              onValueChange={(buyer) => {
                setSelectedFilterBuyer(buyer)
                onDraftFiltersChange({ ...draftFilters, buyerId: buyer?.value ?? "" })
              }}
              loadItems={loadBuyerOptions}
              initialLimit={10}
              searchLimit={10}
              inputProps={{ id: "filterJobBuyer" }}
              placeholder="All buyers"
              loadingMessage="Loading buyers..."
              emptyMessage="No buyers match your search."
              showClear={Boolean(draftFilters.buyerId)}
              inputClassName="h-7 rounded-md px-2 text-xs"
              contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterJobMerchandiser" className="text-xs font-medium text-slate-700 dark:text-slate-300">Merchandiser</label>
            <AppCombobox
              value={filterMerchandiserValue}
              onValueChange={(merchandiser) => {
                setSelectedFilterMerchandiser(merchandiser)
                onDraftFiltersChange({ ...draftFilters, merchandiserId: merchandiser?.value ?? "" })
              }}
              loadItems={loadEmployeeOptions}
              initialLimit={10}
              searchLimit={10}
              inputProps={{ id: "filterJobMerchandiser" }}
              placeholder="All merchandisers"
              loadingMessage="Loading merchandisers..."
              emptyMessage="No merchandisers match your search."
              showClear={Boolean(draftFilters.merchandiserId)}
              inputClassName="h-7 rounded-md px-2 text-xs"
              contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterJobOrderType" className="text-xs font-medium text-slate-700 dark:text-slate-300">Order Type</label>
            <AppSelect
              triggerId="filterJobOrderType"
              value={draftFilters.ordertype || ALL_ORDER_TYPE_VALUE}
              onValueChange={(value) => onDraftFiltersChange({ ...draftFilters, ordertype: value === ALL_ORDER_TYPE_VALUE ? "" : value })}
              placeholder="All order types"
              options={[
                { value: ALL_ORDER_TYPE_VALUE, label: "All order types" },
                { value: "Retail", label: "Retail" },
                { value: "Promotional", label: "Promotional" },
              ]}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterJobStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
            <AppSelect
              triggerId="filterJobStatus"
              value={draftFilters.isActive || ALL_STATUS_VALUE}
              onValueChange={(value) => onDraftFiltersChange({ ...draftFilters, isActive: value === ALL_STATUS_VALUE ? "" : value })}
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
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={onResetFilters}>
              Reset
            </Button>
            {canCreateJob ? (
              <Button type="button" onClick={onCreateJob} className="w-full rounded-xl sm:w-auto">
                <Plus className="size-3.5" />
                New job
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>

      <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
        <div className="lg:hidden">
          {loadingJobs ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : jobs.length > 0 ? (
            <div className="space-y-3 p-4">
              {jobs.map((job) => {
                const label = job.deleted_at ? "Deleted" : job.isActive === false ? "Inactive" : "Active"

                return (
                  <article
                    key={job.id}
                    className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/3"
                  >
                    <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{job.jobNo || "No job no"}</p>
                      <p className="mt-1 truncate text-xs font-medium text-slate-600 dark:text-slate-300">PO: {getPoLabel(job)}</p>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{getFactoryLabel(job)}</p>
                    </div>

                      {canUpdateJob || canDeleteJob ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                              <MoreHorizontal className="size-3.5" />
                              <span className="sr-only">Open actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {canUpdateJob ? <DropdownMenuItem onSelect={() => onEditJob(job.id)}>Edit</DropdownMenuItem> : null}
                            {canUpdateJob && canDeleteJob ? <DropdownMenuSeparator /> : null}
                            {canDeleteJob ? <DropdownMenuItem variant="destructive" onSelect={() => onDeleteJob(job)}>Delete</DropdownMenuItem> : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={jobStatusTone(job)} className="rounded-full px-3 py-1">{label}</Badge>
                      <Badge variant="outline" className="rounded-full px-3 py-1">{getBuyerLabel(job)}</Badge>
                      {job.ordertype ? <Badge variant="outline" className="rounded-full px-3 py-1">{job.ordertype}</Badge> : null}
                    </div>

                    <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <p>Qty: {Number(job.totalPoQty ?? 0)}</p>
                      <p>Details: {job.jobDetails?.length ?? 0}</p>
                      <p>Received: {formatDate(job.poReceiveDate)}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                title="No jobs found"
                description={
                  filtersActive
                    ? "Try clearing or relaxing the current filters."
                    : canCreateJob
                      ? "Create the first job to get started."
                      : "No job records are available for the selected organization."
                }
                actionLabel={filtersActive || !canCreateJob ? "Reset filters" : "New job"}
                onAction={filtersActive || !canCreateJob ? onResetFilters : onCreateJob}
              />
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">{pageSummary}</p>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(1)} disabled={loadingJobs || page <= 1}>
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.max(1, current - 1))} disabled={loadingJobs || page <= 1}>
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.min(meta?.totalPages ?? 1, current + 1))} disabled={loadingJobs || page >= (meta?.totalPages ?? 1)}>
                <ChevronRight className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(meta?.totalPages ?? 1)} disabled={loadingJobs || page >= (meta?.totalPages ?? 1)}>
                <ChevronsRight className="size-3.5" />
              </Button>
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
            isLoading={loadingJobs}
            pageSizeOptions={[10, 25, 50, 100]}
          leadingColumnIds={["jobNo"]}
            onPageChange={(nextPage) => onPageChange(nextPage)}
            onPageSizeChange={(nextPageSize) => onLimitChange(nextPageSize)}
            emptyState={
              <EmptyState
                title="No jobs found"
                description={
                  filtersActive
                    ? "Try clearing or relaxing the current filters."
                    : canCreateJob
                      ? "Create the first job to get started."
                      : "No job records are available for the selected organization."
                }
                actionLabel={filtersActive || !canCreateJob ? "Reset filters" : "New job"}
                onAction={filtersActive || !canCreateJob ? onResetFilters : onCreateJob}
              />
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
