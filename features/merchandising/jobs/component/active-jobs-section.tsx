"use client"

import { Search, MoreHorizontal } from "lucide-react"

import { AppSelect } from "@/components/app-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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

const STATUS_OPTIONS = [
  { value: "__all__", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
]

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
  return String(value).slice(0, 10)
}

export function ActiveJobsSection({
  jobs,
  meta,
  page,
  limit,
  loadingJobs,
  draftFilters,
  activeFilters,
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
  const totalPages = meta?.totalPages ?? 1
  const filterCount = [
    draftFilters.factoryId,
    draftFilters.buyerId,
    draftFilters.merchandiserId,
    draftFilters.ordertype,
    draftFilters.pono,
    draftFilters.isActive,
  ].filter((value) => value.trim()).length
  const filtersActive = Boolean(
    activeFilters.factoryId ||
      activeFilters.buyerId ||
      activeFilters.merchandiserId ||
      activeFilters.ordertype ||
      activeFilters.pono ||
      activeFilters.isActive,
  )

  return (
    <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
      <CardHeader className="border-b border-slate-200/70 p-4 dark:border-white/10 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-lg">Active purchase orders</CardTitle>
            <CardDescription>Review and maintain merchandising order entries.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">Total {meta?.total ?? jobs.length}</Badge>
            {filtersActive ? <Badge variant="outline" className="rounded-full px-3 py-1">{filterCount} filters</Badge> : null}
            {canCreateJob ? <Button type="button" onClick={onCreateJob} className="h-8 rounded-xl">New purchase order</Button> : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="border-b border-slate-200/70 p-3 dark:border-white/10 sm:p-4">
        <form
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"
          onSubmit={(event) => {
            event.preventDefault()
            onActiveFiltersChange(draftFilters)
            onPageChange(1)
          }}
        >
          <Input value={draftFilters.pono} onChange={(event) => onDraftFiltersChange({ ...draftFilters, pono: event.target.value })} placeholder="Search PO number" />
          <Input value={draftFilters.factoryId} onChange={(event) => onDraftFiltersChange({ ...draftFilters, factoryId: event.target.value })} placeholder="Factory ID" />
          <Input value={draftFilters.buyerId} onChange={(event) => onDraftFiltersChange({ ...draftFilters, buyerId: event.target.value })} placeholder="Buyer ID" />
          <Input value={draftFilters.merchandiserId} onChange={(event) => onDraftFiltersChange({ ...draftFilters, merchandiserId: event.target.value })} placeholder="Merchandiser ID" />
          <Input value={draftFilters.ordertype} onChange={(event) => onDraftFiltersChange({ ...draftFilters, ordertype: event.target.value })} placeholder="Retail / Promotional" />
          <AppSelect
            value={draftFilters.isActive || "__all__"}
            onValueChange={(value) => onDraftFiltersChange({ ...draftFilters, isActive: value === "__all__" ? "" : value })}
            options={STATUS_OPTIONS}
          />
          <div className="flex flex-col gap-2 md:flex-row xl:col-span-6 xl:justify-end">
            <Button type="submit" className="rounded-xl"><Search className="size-3.5" /> Apply</Button>
            <Button type="button" variant="outline" onClick={onResetFilters} className="rounded-xl">Reset</Button>
          </div>
        </form>
      </CardContent>

      <CardContent className="space-y-3 p-4">
        {loadingJobs && jobs.length === 0 ? (
          Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-white/10">
            No purchase orders found.
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{getPoLabel(job)}</p>
                    <Badge variant={job.isActive === false ? "outline" : "secondary"} className="rounded-full">{job.isActive === false ? "Inactive" : "Active"}</Badge>
                    {job.ordertype ? <Badge variant="outline" className="rounded-full">{job.ordertype}</Badge> : null}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{getFactoryLabel(job)} · {getBuyerLabel(job)}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Qty: {Number(job.totalPoQty ?? 0)}</span>
                    <span>Details: {job.jobDetails?.length ?? 0}</span>
                    <span>Received: {formatDate(job.poReceiveDate)}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="rounded-xl"><MoreHorizontal className="size-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onEditJob(job.id)} disabled={!canUpdateJob}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onDeleteJob(job)} disabled={!canDeleteJob} className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200/70 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange((current) => Math.max(1, current - 1))}>Previous</Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange((current) => current + 1)}>Next</Button>
            <select value={String(limit)} onChange={(event) => onLimitChange(Number(event.target.value))} className="h-8 rounded-xl border border-input bg-input/20 px-3 text-xs">
              {[5, 10, 20, 50].map((item) => <option key={item} value={item}>{item} / page</option>)}
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
