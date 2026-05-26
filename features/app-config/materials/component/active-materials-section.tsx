"use client"

import { useEffect, useMemo, useState } from "react"

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Loader2,
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

import type { PaginationMeta, MaterialFilterValues, MaterialRecord } from "../material.types"

const ALL_STATUS_VALUE = "__all_statuses__"
const EMPTY_FILTERS: MaterialFilterValues = {
  name: "",
  code: "",
  description: "",
  isActive: "",
}

type MaterialTableSectionProps = {
  data: MaterialRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loading: boolean
  filters: MaterialFilterValues
  onFilterChange: (nextValues: MaterialFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreate: () => void
  onEdit: (materialId: string) => void
  onDelete: (material: MaterialRecord) => void
  onDownloadTemplate: () => void
  onUploadTemplate: () => void
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  downloadingTemplate: boolean
  uploadingTemplate: boolean
  busy: boolean
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function getStatusLabel(material: MaterialRecord) {
  if (material.deleted_at) return "Deleted"
  return material.isActive === false ? "Inactive" : "Active"
}

function getStatusTone(material: MaterialRecord) {
  if (material.deleted_at) return "destructive" as const
  return material.isActive === false ? "outline" as const : "secondary" as const
}

function getUserLabel(
  user?: MaterialRecord["created_by_user"] | MaterialRecord["updated_by_user"] | null,
  fallbackId?: string | null,
) {
  return (
    user?.name?.trim() ||
    user?.display_name?.trim() ||
    user?.user_name?.trim() ||
    fallbackId?.trim() ||
    ""
  )
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

export function ActiveMaterialsSection({
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
  canCreate,
  canUpdate,
  canDelete,
  downloadingTemplate,
  uploadingTemplate,
  busy,
}: MaterialTableSectionProps) {
  const [draftFilters, setDraftFilters] = useState(filters)

  const filterCount = useMemo(
    () =>
      [
        filters.name,
        filters.code,
        filters.description,
        filters.isActive,
      ].filter((value) => value.trim()).length,
    [filters],
  )

  useEffect(() => {
    setDraftFilters(filters)
  }, [filters])

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No materials found"
    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<MaterialRecord>[]>(() => [
    {
      id: "material",
      header: "Material",
      cell: ({ row }) => (
        <div className="pl-4">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
              {(row.original.name?.trim() || "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p
                title={row.original.name}
                className="line-clamp-2 whitespace-normal break-words text-xs font-semibold leading-5 text-slate-950 dark:text-slate-50"
              >
                {row.original.name}
              </p>
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
      id: "unit",
      header: "Unit",
      cell: ({ row }) => {
        const unit = row.original.unit
        return <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{unit?.name || "-"}</span>
      },
    },
    {
      id: "materialGroup",
      header: "Group",
      cell: ({ row }) => <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.original.materialGroup?.name || "-"}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={getStatusTone(row.original)} className="rounded-full px-3 py-1">{getStatusLabel(row.original)}</Badge>,
    },
    {
      id: "created",
      header: "Created",
      cell: ({ row }) => {
        const label = getUserLabel(
          row.original.created_by_user,
          row.original.created_by_id,
        )

        return (
          <div className="space-y-1">
            <p className="text-xs text-slate-700 dark:text-slate-200">
              {formatDate(row.original.created_at)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {label || "No creator metadata"}
            </p>
          </div>
        )
      },
    },
    {
      id: "updated",
      header: "Updated",
      cell: ({ row }) => {
        const material = row.original
        const hasUpdateMetadata = Boolean(material.updated_by_id || material.updated_by_user)

        return hasUpdateMetadata ? (
          <div className="space-y-1">
            <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(material.updated_at)}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {getUserLabel(material.updated_by_user, material.updated_by_id)
                || "No editor metadata"}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">Not edited yet</p>
        )
      },
    },
    {
      id: "actions",
      header: () => <span className="pr-4">Actions</span>,
      cell: ({ row }) => {
        const hasActions = canUpdate || canDelete

        if (!hasActions) {
          return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>
        }

        return (
          <div className="pr-4 text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" disabled={busy}>
                  <MoreHorizontal className="size-3.5" />
                  <span className="sr-only">Open actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canUpdate ? <DropdownMenuItem onSelect={() => onEdit(row.original.id)}>Edit material</DropdownMenuItem> : null}
                {canUpdate && canDelete ? <DropdownMenuSeparator /> : null}
                {canDelete ? (
                  <DropdownMenuItem variant="destructive" onSelect={() => onDelete(row.original)}>
                    Delete material
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [busy, canDelete, canUpdate, onDelete, onEdit])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS)
    onFilterChange(EMPTY_FILTERS)
    onPageChange(1)
  }

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-base">Materials table</CardTitle>
            <CardDescription>{pageSummary}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}
            </Badge>
            <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">
              {filterCount} active filter{filterCount === 1 ? "" : "s"}
            </Badge>
            {canCreate ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-full" disabled={busy}>
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open material bulk actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onSelect={onDownloadTemplate} disabled={downloadingTemplate}>
                    <Download className="size-3.5" />
                    {downloadingTemplate ? "Downloading template..." : "Download template"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onUploadTemplate} disabled={uploadingTemplate}>
                    <Upload className="size-3.5" />
                    {uploadingTemplate ? "Uploading materials..." : "Upload materials"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        {busy ? (
          <div className="flex items-center gap-2 px-0 pb-4 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Loader2 className="size-3.5 animate-spin" />
            Uploading materials. Please wait.
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="p-3 sm:p-0 sm:px-2">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onFilterChange(draftFilters)
            onPageChange(1)
          }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.35fr)_minmax(0,0.9fr)_minmax(0,16rem)]"
        >
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterMaterialName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Material name</label>
            <Input id="filterMaterialName" value={draftFilters.name} className="h-7 rounded-md px-2 text-xs" onChange={(event) => setDraftFilters((current) => ({ ...current, name: event.target.value }))} placeholder="Input material name" disabled={busy} />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterMaterialCode" className="text-xs font-medium text-slate-700 dark:text-slate-300">Code</label>
            <Input id="filterMaterialCode" value={draftFilters.code} className="h-7 rounded-md px-2 text-xs" onChange={(event) => setDraftFilters((current) => ({ ...current, code: event.target.value }))} placeholder="Input code" disabled={busy} />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterMaterialDescription" className="text-xs font-medium text-slate-700 dark:text-slate-300">Description</label>
            <Input id="filterMaterialDescription" value={draftFilters.description} className="h-7 rounded-md px-2 text-xs" onChange={(event) => setDraftFilters((current) => ({ ...current, description: event.target.value }))} placeholder="Input description" disabled={busy} />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterMaterialStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
            <AppSelect
              triggerId="filterMaterialStatus"
              value={draftFilters.isActive || ALL_STATUS_VALUE}
              onValueChange={(value) => setDraftFilters((current) => ({ ...current, isActive: value === ALL_STATUS_VALUE ? "" : value }))}
              placeholder="All statuses"
              disabled={busy}
              options={[
                { value: ALL_STATUS_VALUE, label: "All statuses" },
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end xl:col-span-1">
            <Button type="submit" className="w-full rounded-xl sm:w-auto" disabled={busy}>
              <Search className="size-3.5" />
              Search
            </Button>
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={clearFilters} disabled={busy}>
              Reset
            </Button>
            {canCreate ? (
              <Button type="button" onClick={onCreate} className="w-full rounded-xl sm:w-auto" disabled={busy}>
                <Plus className="size-3.5" />
                New material
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>

      <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : data.length > 0 ? (
            <div className="space-y-3 p-4">
              {data.map((material) => (
                <article
                  key={material.id}
                  className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{material.name}</p>
                    </div>

                    {canUpdate || canDelete ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" disabled={busy}>
                            <MoreHorizontal className="size-3.5" />
                            <span className="sr-only">Open actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {canUpdate ? <DropdownMenuItem onSelect={() => onEdit(material.id)}>Edit material</DropdownMenuItem> : null}
                          {canUpdate && canDelete ? <DropdownMenuSeparator /> : null}
                          {canDelete ? <DropdownMenuItem variant="destructive" onSelect={() => onDelete(material)}>Delete material</DropdownMenuItem> : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={getStatusTone(material)} className="rounded-full px-3 py-1">{getStatusLabel(material)}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">{material.code || "No code"}</Badge>
                  </div>

                  <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <p>Unit: {material.unit?.name || "-"}</p>
                    <p>Group: {material.materialGroup?.name || "-"}</p>
                    <div className="space-y-1">
                      <p>Created: {formatDate(material.created_at)}</p>
                      <p>
                        {getUserLabel(material.created_by_user, material.created_by_id) || "No creator metadata"}
                      </p>
                    </div>
                    <p>Updated: {material.updated_at ? formatDate(material.updated_at) : "Not edited yet"}</p>
                    <p>
                      {getUserLabel(material.updated_by_user, material.updated_by_id) || "No editor metadata"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                title="No materials found"
                description="Try clearing or relaxing the current filters."
                actionLabel="Reset"
                onAction={clearFilters}
              />
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">{pageSummary}</p>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(1)} disabled={loading || busy || page <= 1}>
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.max(1, current - 1))} disabled={loading || busy || page <= 1}>
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.min(meta?.totalPages ?? 1, current + 1))} disabled={loading || busy || page >= (meta?.totalPages ?? 1)}>
                <ChevronRight className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(meta?.totalPages ?? 1)} disabled={loading || busy || page >= (meta?.totalPages ?? 1)}>
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
            controlsDisabled={busy}
            pageSizeOptions={[5, 10, 25, 50]}
            columnClassNames={{
              material: "w-[320px] min-w-[320px]",
            }}
            onPageChange={(nextPage) => onPageChange(nextPage)}
            onPageSizeChange={(nextPageSize) => {
              onLimitChange(nextPageSize)
              onPageChange(1)
            }}
            emptyState={
              <EmptyState
                title="No materials found"
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
