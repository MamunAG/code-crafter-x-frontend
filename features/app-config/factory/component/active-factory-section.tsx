"use client"

import { useMemo } from "react"

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
} from "lucide-react"
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

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

import type { FactoryFilterValues, FactoryRecord, PaginationMeta } from "../factory.types"

const ALL_STATUS_VALUE = "__all_statuses__"

type FactoryTableSectionProps = {
  data: FactoryRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loading: boolean
  filters: FactoryFilterValues
  onFilterChange: (nextValues: FactoryFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreate: () => void
  onEdit: (factoryId: string) => void
  onDelete: (factory: FactoryRecord) => void
  onDownloadTemplate?: () => void
  onUploadTemplate?: () => void
  downloadingTemplate?: boolean
  uploadingTemplate?: boolean
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function getStatusLabel(factory: FactoryRecord) {
  if (factory.deleted_at) return "Deleted"
  return factory.isActive === false ? "Inactive" : "Active"
}

function getStatusTone(factory: FactoryRecord) {
  if (factory.deleted_at) return "destructive" as const
  return factory.isActive === false ? "outline" as const : "secondary" as const
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

const MOBILE_SKELETONS = Array.from({ length: 5 })

export function ActiveFactorySection({
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
  onDownloadTemplate,
  onUploadTemplate,
  downloadingTemplate = false,
  uploadingTemplate = false,
}: FactoryTableSectionProps) {
  const filterCount = useMemo(
    () =>
      [
        filters.name,
        filters.displayName,
        filters.code,
        filters.contact,
        filters.email,
        filters.address,
        filters.isActive,
      ].filter((value) => value.trim()).length,
    [filters],
  )

  const activeCount = useMemo(
    () => data.filter((factory) => !factory.deleted_at && factory.isActive !== false).length,
    [data],
  )

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No factories found"
    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<FactoryRecord>[]>(() => [
    {
      id: "factory",
      header: "Factory",
      cell: ({ row }) => (
        <div className="pl-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
              {(row.original.name?.trim() || "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{row.original.name}</p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{row.original.displayName}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "code",
      header: "Code",
      cell: ({ row }) => <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.original.code || "-"}</span>,
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.original.contact || "-"}</span>,
    },
    {
      id: "email",
      header: "Email",
      cell: ({ row }) => <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.original.email || "-"}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={getStatusTone(row.original)} className="rounded-full px-3 py-1">{getStatusLabel(row.original)}</Badge>,
    },
    {
      id: "created",
      header: "Created",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(row.original.created_at)}</p>
        </div>
      ),
    },
    {
      id: "updated",
      header: "Updated",
      cell: ({ row }) => {
        const factory = row.original
        const hasUpdateMetadata = Boolean(factory.updated_by_id || factory.updated_by_user)

        return (
          <div className="space-y-1">
            {hasUpdateMetadata ? (
              <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(factory.updated_at)}</p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">Not edited yet</p>
            )}
          </div>
        )
      },
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
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => onEdit(row.original.id)}>Edit factory</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(row.original)}>
                Delete factory
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [onDelete, onEdit])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const clearFilters = () => {
    onFilterChange({
      name: "",
      displayName: "",
      code: "",
      contact: "",
      email: "",
      address: "",
      isActive: "",
    })
    onPageChange(1)
  }

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Factories table</CardTitle>
            <CardDescription>{pageSummary}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}
            </Badge>
            <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">
              {filterCount} active filter{filterCount === 1 ? "" : "s"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="rounded-full">
                  <MoreHorizontal className="size-2.5" />
                  {/* Bulk actions */}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={onDownloadTemplate} disabled={downloadingTemplate}>
                  <Download className="mr-2 size-3.5" />
                  {downloadingTemplate ? "Downloading template..." : "Download template"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onUploadTemplate} disabled={uploadingTemplate}>
                  <Upload className="mr-2 size-3.5" />
                  {uploadingTemplate ? "Uploading factories..." : "Upload factories"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-0 sm:px-2">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onPageChange(1)
          }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
        >
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterFactoryName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Factory name</label>
            <Input
              id="filterFactoryName"
              value={filters.name}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) => onFilterChange({ ...filters, name: event.target.value })}
              placeholder="Input factory name"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterFactoryDisplayName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Display name</label>
            <Input
              id="filterFactoryDisplayName"
              value={filters.displayName}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) => onFilterChange({ ...filters, displayName: event.target.value })}
              placeholder="Input display name"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterFactoryCode" className="text-xs font-medium text-slate-700 dark:text-slate-300">Code</label>
            <Input
              id="filterFactoryCode"
              value={filters.code}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) => onFilterChange({ ...filters, code: event.target.value })}
              placeholder="Input code"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterFactoryContact" className="text-xs font-medium text-slate-700 dark:text-slate-300">Contact</label>
            <Input
              id="filterFactoryContact"
              value={filters.contact}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) => onFilterChange({ ...filters, contact: event.target.value })}
              placeholder="Input contact"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterFactoryEmail" className="text-xs font-medium text-slate-700 dark:text-slate-300">Email</label>
            <Input
              id="filterFactoryEmail"
              value={filters.email}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) => onFilterChange({ ...filters, email: event.target.value })}
              placeholder="Input email"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterFactoryStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
            <AppSelect
              triggerId="filterFactoryStatus"
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-6">
            <Button type="submit" className="w-full rounded-xl sm:w-auto">
              <Search className="size-3.5" />
              Search
            </Button>
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={clearFilters}>
              Reset
            </Button>
            <Button type="button" onClick={onCreate} className="w-full rounded-xl sm:w-auto">
              <Plus className="size-3.5" />
              New factory
            </Button>
          </div>
        </form>
      </CardContent>

      <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-3 p-4">
              {MOBILE_SKELETONS.map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : data.length > 0 ? (
            <div className="space-y-3 p-4">
              {data.map((factory) => (
                <article
                  key={factory.id}
                  className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                          {(factory.name?.trim() || "?").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{factory.name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{factory.displayName}</p>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                          <MoreHorizontal className="size-3.5" />
                          <span className="sr-only">Open actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => onEdit(factory.id)}>Edit factory</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(factory)}>
                          Delete factory
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={getStatusTone(factory)} className="rounded-full px-3 py-1">{getStatusLabel(factory)}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">{factory.code || "No code"}</Badge>
                  </div>

                  <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <p>Contact: {factory.contact || "-"}</p>
                    <p>Email: {factory.email || "-"}</p>
                    <p>Created: {formatDate(factory.created_at)}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                title="No factories found"
                description="Try clearing or relaxing the current filters."
                actionLabel="Reset"
                onAction={clearFilters}
              />
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">{pageSummary}</p>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(1)} disabled={loading || page <= 1}>
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={loading || page <= 1}>
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(Math.min(meta?.totalPages ?? 1, page + 1))} disabled={loading || page >= (meta?.totalPages ?? 1)}>
                <ChevronRight className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(meta?.totalPages ?? 1)} disabled={loading || page >= (meta?.totalPages ?? 1)}>
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
            isLoading={loading}
            pageSizeOptions={[5, 10, 25, 50]}
            onPageChange={(nextPage) => onPageChange(nextPage)}
            onPageSizeChange={(nextPageSize) => {
              onLimitChange(nextPageSize)
              onPageChange(1)
            }}
            emptyState={
              <EmptyState
                title="No factories found"
                description="Try clearing or relaxing the current filters."
                actionLabel="Reset"
                onAction={clearFilters}
              />
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
