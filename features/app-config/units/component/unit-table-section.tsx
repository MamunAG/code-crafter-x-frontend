"use client"

import { useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  MoreHorizontal,
  Ruler,
  Upload,
} from "lucide-react"
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { AppDataTable } from "@/components/app-data-table"
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
import { Skeleton } from "@/components/ui/skeleton"

import type { PaginationMeta, UnitRecord } from "../unit.types"

type UnitTableSectionProps = {
  units: UnitRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loadingUnits: boolean
  filtersActive: boolean
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreateUnit: () => void
  onEditUnit: (unitId: number) => void
  onDeleteUnit: (unit: UnitRecord) => void
  onResetFilters: () => void
  onDownloadTemplate: () => void
  onUploadTemplate: () => void
  canCreateUnit: boolean
  canUpdateUnit: boolean
  canDeleteUnit: boolean
  downloadingTemplate: boolean
  uploadingTemplate: boolean
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function sizeBadgeTone(unit?: UnitRecord | null) {
  if (!unit) return "outline" as const
  if (unit.deleted_at) return "destructive" as const
  return unit.isActive === false ? "outline" : "secondary"
}

function getUnitStatusLabel(unit?: UnitRecord | null) {
  if (!unit) return "Inactive"
  if (unit.deleted_at) return "Deleted"
  return unit.isActive === false ? "Inactive" : "Active"
}

function getUserLabel(user?: { name?: string | null } | null, fallback?: string | null) {
  return user?.name?.trim() || fallback?.trim() || ""
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
        <Ruler className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">
        {actionLabel}
      </Button>
    </div>
  )
}

export function UnitTableSection({
  units,
  meta,
  page,
  limit,
  loadingUnits,
  filtersActive,
  onPageChange,
  onLimitChange,
  onCreateUnit,
  onEditUnit,
  onDeleteUnit,
  onResetFilters,
  onDownloadTemplate,
  onUploadTemplate,
  canCreateUnit,
  canUpdateUnit,
  canDeleteUnit,
  downloadingTemplate,
  uploadingTemplate,
}: UnitTableSectionProps) {
  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) {
      return "No units found"
    }

    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<UnitRecord>[]>(
    () => [
      {
        id: "name",
        header: "Unit",
        cell: ({ row }) => {
          const unit = row.original

          return (
            <div className="pl-4">
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
                  {(unit.name?.trim() || "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{unit.name}</p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">ID #{unit.id}</p>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        id: "shortName",
        header: "Short name",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {row.original.shortName}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const unit = row.original
          const tone = sizeBadgeTone(unit)
          const label = getUnitStatusLabel(unit)
          return <Badge variant={tone} className="rounded-full px-3 py-1">{label}</Badge>
        },
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => {
          const unit = row.original

          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(unit.created_at)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserLabel(unit.created_by_user, unit.created_by_id)
                  ? `Created by ${getUserLabel(unit.created_by_user, unit.created_by_id)}`
                  : "No creator metadata"}
              </p>
            </div>
          )
        },
      },
      {
        id: "updated",
        header: "Updated",
        cell: ({ row }) => {
          const unit = row.original
          const hasUpdateMetadata = Boolean(unit.updated_by_id || unit.updated_by_user)

          return (
            <div className="space-y-1">
              {hasUpdateMetadata ? (
                <>
                  <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(unit.updated_at)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {getUserLabel(unit.updated_by_user, unit.updated_by_id)
                      ? `Updated by ${getUserLabel(unit.updated_by_user, unit.updated_by_id)}`
                      : "No editor metadata"}
                  </p>
                </>
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
        cell: ({ row }) => {
          const unit = row.original
          const hasActions = canUpdateUnit || canDeleteUnit

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
                  {canUpdateUnit ? (
                    <DropdownMenuItem onSelect={() => onEditUnit(unit.id)}>Edit unit</DropdownMenuItem>
                  ) : null}
                  {canUpdateUnit && canDeleteUnit ? <DropdownMenuSeparator /> : null}
                  {canDeleteUnit ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => onDeleteUnit(unit)}>
                      Delete unit
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [canDeleteUnit, canUpdateUnit, onDeleteUnit, onEditUnit],
  )

  const table = useReactTable({
    data: units,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Units table</CardTitle>
            <CardDescription>{pageSummary}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {canCreateUnit ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-full">
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open unit bulk actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onSelect={onDownloadTemplate} disabled={downloadingTemplate}>
                    <Download className="size-3.5" />
                    {downloadingTemplate ? "Downloading template..." : "Download template"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onUploadTemplate} disabled={uploadingTemplate}>
                    <Upload className="size-3.5" />
                    {uploadingTemplate ? "Uploading units..." : "Upload units"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="lg:hidden">
          {loadingUnits ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : units.length > 0 ? (
            <div className="space-y-3 p-4">
              {units.map((unit) => {
                const tone = sizeBadgeTone(unit)
                const label = getUnitStatusLabel(unit)

                return (
                  <article
                    key={unit.id}
                    className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                            {(unit.name?.trim() || "?").charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{unit.name}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">Short: {unit.shortName}</p>
                          </div>
                        </div>
                      </div>

                      {canUpdateUnit || canDeleteUnit ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                              <MoreHorizontal className="size-3.5" />
                              <span className="sr-only">Open actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {canUpdateUnit ? (
                              <DropdownMenuItem onSelect={() => onEditUnit(unit.id)}>Edit unit</DropdownMenuItem>
                            ) : null}
                            {canUpdateUnit && canDeleteUnit ? <DropdownMenuSeparator /> : null}
                            {canDeleteUnit ? (
                              <DropdownMenuItem variant="destructive" onSelect={() => onDeleteUnit(unit)}>
                                Delete unit
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={tone} className="rounded-full px-3 py-1">
                        {label}
                      </Badge>
                      {unit.deleted_at ? (
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          Deleted record
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-start justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <div className="space-y-1">
                        <span className="block">Created: {formatDate(unit.created_at)}</span>
                        {unit.updated_by_id || unit.updated_by_user ? (
                          <span className="block">Updated: {formatDate(unit.updated_at)}</span>
                        ) : (
                          <span className="block">Not edited yet</span>
                        )}
                      </div>
                      <span>#{unit.id}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                title="No units found"
                description={
                  filtersActive
                    ? "Try clearing or relaxing the current filters."
                    : canCreateUnit
                      ? "Create the first unit to get started."
                      : "No unit records are available for the selected organization."
                }
                actionLabel={filtersActive || !canCreateUnit ? "Reset filters" : "New unit"}
                onAction={filtersActive || !canCreateUnit ? onResetFilters : onCreateUnit}
              />
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">{pageSummary}</p>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(1)} disabled={loadingUnits || page <= 1}>
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.max(1, current - 1))} disabled={loadingUnits || page <= 1}>
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.min(meta?.totalPages ?? 1, current + 1))} disabled={loadingUnits || page >= (meta?.totalPages ?? 1)}>
                <ChevronRight className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(meta?.totalPages ?? 1)} disabled={loadingUnits || page >= (meta?.totalPages ?? 1)}>
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
            isLoading={loadingUnits}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={(nextPage) => onPageChange(nextPage)}
            onPageSizeChange={(nextPageSize) => onLimitChange(nextPageSize)}
            emptyState={
              <EmptyState
                title="No units found"
                description={
                  filtersActive
                    ? "Try clearing or relaxing the current filters."
                    : canCreateUnit
                      ? "Create the first unit to get started."
                      : "No unit records are available for the selected organization."
                }
                actionLabel={filtersActive || !canCreateUnit ? "Reset filters" : "New unit"}
                onAction={filtersActive || !canCreateUnit ? onResetFilters : onCreateUnit}
              />
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
