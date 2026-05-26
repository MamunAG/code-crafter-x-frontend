"use client"

import { useMemo } from "react"

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Search,
  Trash2,
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

const ALL_STATUS_VALUE = "__all_deleted_statuses__"

type DeletedMaterialActionMode = "restore" | "permanent"

type DeletedMaterialsSectionProps = {
  data: MaterialRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loading: boolean
  error: string
  filters: MaterialFilterValues
  onFilterChange: (nextValues: MaterialFilterValues) => void
  onPageChange: (nextPage: number) => void
  onLimitChange: (nextPageSize: number) => void
  onOpenAction: (material: MaterialRecord, mode: DeletedMaterialActionMode) => void
  canRestore: boolean
  canPermanentlyDelete: boolean
  busy: boolean
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function getStatusLabel(material: MaterialRecord) {
  return material.deleted_at ? "Deleted" : material.isActive === false ? "Inactive" : "Active"
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

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <Trash2 className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  )
}

export function DeletedMaterialsSection({
  data,
  meta,
  page,
  limit,
  loading,
  error,
  filters,
  onFilterChange,
  onPageChange,
  onLimitChange,
  onOpenAction,
  canRestore,
  canPermanentlyDelete,
  busy,
}: DeletedMaterialsSectionProps) {
  const deletedFilterCount = useMemo(
    () =>
      [
        filters.name,
        filters.code,
        filters.description,
        filters.isActive,
      ].filter((value) => value.trim()).length,
    [filters],
  )

  const deletedPageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No deleted materials found"
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
          <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{row.original.name}</p>
        </div>
      ),
    },
    {
      id: "code",
      header: "Code",
      cell: ({ row }) => <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.original.code || "-"}</span>,
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
        const label = getUserLabel(row.original.created_by_user, row.original.created_by_id)

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
      id: "deleted",
      header: "Deleted",
      cell: ({ row }) => <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(row.original.deleted_at)}</p>,
    },
    {
      id: "updatedBy",
      header: "Updated by",
      cell: ({ row }) => {
        const label = getUserLabel(row.original.updated_by_user, row.original.updated_by_id)
        return label ? (
          <p className="text-xs text-slate-700 dark:text-slate-200">{label}</p>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">No editor metadata</p>
        )
      },
    },
    {
      id: "actions",
      header: () => <span className="pr-4">Actions</span>,
      cell: ({ row }) => {
        const hasActions = canRestore || canPermanentlyDelete

        if (!hasActions) {
          return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>
        }

        return (
          <div className="pr-4 text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" disabled={busy}>
                  <MoreHorizontal className="size-3.5" />
                  <span className="sr-only">Open deleted item actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canRestore ? <DropdownMenuItem onSelect={() => onOpenAction(row.original, "restore")}>Restore material</DropdownMenuItem> : null}
                {canRestore && canPermanentlyDelete ? <DropdownMenuSeparator /> : null}
                {canPermanentlyDelete ? (
                  <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(row.original, "permanent")}>
                    Delete permanently
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [busy, canPermanentlyDelete, canRestore, onOpenAction])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const clearFilters = () => {
    onFilterChange({
      name: "",
      code: "",
      description: "",
      isActive: "",
    })
    onPageChange(1)
  }

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Deleted materials</CardTitle>
            <CardDescription>{deletedPageSummary}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              {meta?.total ?? data.length} deleted
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
            onPageChange(1)
          }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
        >
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedMaterialName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Material name</label>
            <Input id="deletedMaterialName" value={filters.name} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onFilterChange({ ...filters, name: event.target.value })} placeholder="Input material name" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedMaterialCode" className="text-xs font-medium text-slate-700 dark:text-slate-300">Code</label>
            <Input id="deletedMaterialCode" value={filters.code} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onFilterChange({ ...filters, code: event.target.value })} placeholder="Input code" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedMaterialDescription" className="text-xs font-medium text-slate-700 dark:text-slate-300">Description</label>
            <Input id="deletedMaterialDescription" value={filters.description} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onFilterChange({ ...filters, description: event.target.value })} placeholder="Input description" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedMaterialStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
            <AppSelect
              triggerId="deletedMaterialStatus"
              value={filters.isActive || ALL_STATUS_VALUE}
              onValueChange={(value) => onFilterChange({ ...filters, isActive: value === ALL_STATUS_VALUE ? "" : value })}
              placeholder="All statuses"
              disabled={busy}
              options={[
                { value: ALL_STATUS_VALUE, label: "All statuses" },
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
            <Button type="submit" className="w-full rounded-xl sm:w-auto" disabled={busy}>
              <Search className="size-3.5" />
              Search
            </Button>
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={clearFilters} disabled={busy}>
              Reset
            </Button>
          </div>
        </form>
      </CardContent>

      <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
        {error ? (
          <div className="p-4">
            <EmptyState title="Unable to load deleted materials" description={error} />
          </div>
        ) : null}

        {!error ? (
          <>
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

                        {canRestore || canPermanentlyDelete ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" disabled={busy}>
                                <MoreHorizontal className="size-3.5" />
                                <span className="sr-only">Open deleted item actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {canRestore ? <DropdownMenuItem onSelect={() => onOpenAction(material, "restore")}>Restore material</DropdownMenuItem> : null}
                              {canRestore && canPermanentlyDelete ? <DropdownMenuSeparator /> : null}
                              {canPermanentlyDelete ? (
                                <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(material, "permanent")}>
                                  Delete permanently
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="destructive" className="rounded-full px-3 py-1">Deleted</Badge>
                        <Badge variant="outline" className="rounded-full px-3 py-1">{material.code || "No code"}</Badge>
                      </div>

                      <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <div className="space-y-1">
                          <p>Created: {formatDate(material.created_at)}</p>
                          <p>
                            {getUserLabel(material.created_by_user, material.created_by_id) || "No creator metadata"}
                          </p>
                        </div>
                        <p>{getUserLabel(material.updated_by_user, material.updated_by_id) || "No editor metadata"}</p>
                        <p>Deleted: {formatDate(material.deleted_at)}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState
                    title="No deleted materials found"
                    description="Try clearing or relaxing the current filters."
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(1)} disabled={loading || busy || page <= 1}>
                    <ChevronsLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={loading || busy || page <= 1}>
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(Math.min(meta?.totalPages ?? 1, page + 1))} disabled={loading || busy || page >= (meta?.totalPages ?? 1)}>
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
                pageSummary={deletedPageSummary}
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
                    title="No deleted materials found"
                    description="Try clearing or relaxing the current filters."
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
