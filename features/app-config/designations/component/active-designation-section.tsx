"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, Plus, Search } from "lucide-react"
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table"

import { AppDataTable } from "@/components/app-data-table"
import { AppSelect } from "@/components/app-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import type { DesignationFilterValues, DesignationRecord, PaginationMeta } from "../designation.types"

const ALL_STATUS_VALUE = "__all_statuses__"
const MOBILE_SKELETONS = Array.from({ length: 5 })

type ActiveDesignationSectionProps = {
  data: DesignationRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loading: boolean
  filters: DesignationFilterValues
  onFilterChange: (nextValues: DesignationFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreate: () => void
  onEdit: (designationId: string) => void
  onDelete: (designation: DesignationRecord) => void
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function getStatusLabel(designation: DesignationRecord) {
  if (designation.deleted_at) return "Deleted"
  return designation.isActive === false ? "Inactive" : "Active"
}

function getStatusTone(designation: DesignationRecord) {
  if (designation.deleted_at) return "destructive" as const
  return designation.isActive === false ? "outline" as const : "secondary" as const
}

function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <Plus className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">
        {actionLabel}
      </Button>
    </div>
  )
}

export function ActiveDesignationSection({
  data,
  meta,
  page,
  limit,
  loading,
  filters,
  onFilterChange,
  onPageChange,
  onLimitChange,
  onCreate,
  onEdit,
  onDelete,
}: ActiveDesignationSectionProps) {
  const filterCount = useMemo(
    () => [filters.designationName, filters.isActive].filter((value) => value.trim()).length,
    [filters],
  )

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No designations found"
    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const clearFilters = () => {
    onFilterChange({ designationName: "", isActive: "" })
    onPageChange(1)
  }

  const columns = useMemo<ColumnDef<DesignationRecord>[]>(() => [
    {
      id: "designation",
      header: "Designation",
      cell: ({ row }) => (
        <div className="pl-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
              {(row.original.designationName?.trim() || "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{row.original.designationName}</p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{row.original.description || "No description"}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={getStatusTone(row.original)} className="rounded-full px-3 py-1">{getStatusLabel(row.original)}</Badge>,
    },
    {
      id: "created",
      header: "Created",
      cell: ({ row }) => <span className="text-xs text-slate-700 dark:text-slate-200">{formatDate(row.original.created_at)}</span>,
    },
    {
      id: "updated",
      header: "Updated",
      cell: ({ row }) => (
        <span className="text-xs text-slate-700 dark:text-slate-200">
          {row.original.updated_by_id || row.original.updated_by_user ? formatDate(row.original.updated_at) : "Not edited yet"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="pr-4">Actions</span>,
      cell: ({ row }) => (
        <div className="pr-4 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                <MoreHorizontal className="size-3.5" />
                <span className="sr-only">Open actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => onEdit(row.original.id)}>Edit designation</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(row.original)}>
                Delete designation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [onDelete, onEdit])

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Designations table</CardTitle>
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
            onPageChange(1)
          }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <div className="min-w-0 space-y-1 xl:col-span-2">
            <label htmlFor="filterDesignationName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Designation name</label>
            <Input
              id="filterDesignationName"
              value={filters.designationName}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) => onFilterChange({ ...filters, designationName: event.target.value })}
              placeholder="Input designation name"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterDesignationStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
            <AppSelect
              triggerId="filterDesignationStatus"
              value={filters.isActive || ALL_STATUS_VALUE}
              onValueChange={(value) => onFilterChange({ ...filters, isActive: value === ALL_STATUS_VALUE ? "" : value })}
              placeholder="All statuses"
              options={[
                { value: ALL_STATUS_VALUE, label: "All statuses" },
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
            <Button type="submit" className="w-full rounded-xl sm:w-auto">
              <Search className="size-3.5" />
              Search
            </Button>
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={clearFilters}>
              Reset
            </Button>
            <Button type="button" onClick={onCreate} className="w-full rounded-xl sm:w-auto">
              <Plus className="size-3.5" />
              New
            </Button>
          </div>
        </form>
      </CardContent>

      <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-3 p-4">{MOBILE_SKELETONS.map((_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}</div>
          ) : data.length > 0 ? (
            <div className="space-y-3 p-4">
              {data.map((designation) => (
                <article key={designation.id} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{designation.designationName}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{designation.description || "No description"}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => onEdit(designation.id)}>Edit designation</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(designation)}>Delete designation</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={getStatusTone(designation)} className="rounded-full px-3 py-1">{getStatusLabel(designation)}</Badge>
                  </div>
                  <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <p>Created: {formatDate(designation.created_at)}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState title="No designations found" description="Try clearing or relaxing the current filters." actionLabel="Reset" onAction={clearFilters} />
            </div>
          )}
          <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">{pageSummary}</p>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(1)} disabled={loading || page <= 1}><ChevronsLeft className="size-3.5" /></Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={loading || page <= 1}><ChevronLeft className="size-3.5" /></Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(Math.min(meta?.totalPages ?? 1, page + 1))} disabled={loading || page >= (meta?.totalPages ?? 1)}><ChevronRight className="size-3.5" /></Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(meta?.totalPages ?? 1)} disabled={loading || page >= (meta?.totalPages ?? 1)}><ChevronsRight className="size-3.5" /></Button>
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
            isLoading={loading}
            pageSizeOptions={[5, 10, 25, 50]}
            onPageChange={(nextPage) => onPageChange(nextPage)}
            onPageSizeChange={(nextPageSize) => {
              onLimitChange(nextPageSize)
              onPageChange(1)
            }}
            emptyState={<EmptyState title="No designations found" description="Try clearing or relaxing the current filters." actionLabel="Reset" onAction={clearFilters} />}
          />
        </div>
      </CardContent>
    </Card>
  )
}
