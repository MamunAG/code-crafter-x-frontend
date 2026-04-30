"use client"

import { useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Sparkles,
  Search,
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import type {
  EmbellishmentFilterValues,
  EmbellishmentRecord,
  PaginationMeta,
} from "../embellishment.types"

type EmbellishmentTableSectionProps = {
  embellishments: EmbellishmentRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loadingEmbellishments: boolean
  draftFilters: EmbellishmentFilterValues
  activeFilters: EmbellishmentFilterValues
  onDraftFiltersChange: (nextValues: EmbellishmentFilterValues) => void
  onActiveFiltersChange: (nextValues: EmbellishmentFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreateEmbellishment: () => void
  onEditEmbellishment: (embellishmentId: number) => void
  onDeleteEmbellishment: (embellishment: EmbellishmentRecord) => void
  onResetFilters: () => void
  canCreateEmbellishment: boolean
  canUpdateEmbellishment: boolean
  canDeleteEmbellishment: boolean
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not available"
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

function embellishmentBadgeTone(embellishment?: EmbellishmentRecord | null) {
  if (!embellishment) {
    return "outline" as const
  }

  if (embellishment.deleted_at) {
    return "destructive" as const
  }

  return embellishment.isActive === "N" ? "outline" : "secondary"
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
        <Sparkles className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">
        {description}
      </p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">
        {actionLabel}
      </Button>
    </div>
  )
}

export function EmbellishmentTableSection({
  embellishments,
  meta,
  page,
  limit,
  loadingEmbellishments,
  draftFilters,
  activeFilters,
  onDraftFiltersChange,
  onActiveFiltersChange,
  onPageChange,
  onLimitChange,
  onCreateEmbellishment,
  onEditEmbellishment,
  onDeleteEmbellishment,
  onResetFilters,
  canCreateEmbellishment,
  canUpdateEmbellishment,
  canDeleteEmbellishment,
}: EmbellishmentTableSectionProps) {
  const filterCount = useMemo(
    () => [draftFilters.name, draftFilters.remarks].filter((value) => value.trim()).length,
    [draftFilters],
  )

  const filtersActive = Boolean(activeFilters.name || activeFilters.remarks)

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) {
      return "No embellishments found"
    }

    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<EmbellishmentRecord>[]>(
    () => [
      {
        id: "embellishment",
        header: "Embellishment",
        cell: ({ row }) => {
          const embellishment = row.original

          return (
            <div className="pl-4">
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
                  {(embellishment.name?.trim() || "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">
                    {embellishment.name}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    ID #{embellishment.id}
                  </p>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        id: "remarks",
        header: "Remarks",
        cell: ({ row }) => (
          <p className="line-clamp-2 max-w-[26rem] whitespace-normal text-xs leading-5 text-slate-600 dark:text-slate-300">
            {row.original.remarks || "No remarks provided."}
          </p>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const embellishment = row.original
          const tone = embellishmentBadgeTone(embellishment)
          const label = embellishment.deleted_at ? "Deleted" : embellishment.isActive === "N" ? "Inactive" : "Active"

          return <Badge variant={tone} className="rounded-full px-3 py-1">{label}</Badge>
        },
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => {
          const embellishment = row.original

          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">
                {formatDate(embellishment.created_at)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserLabel(embellishment.created_by_user, embellishment.created_by_id)
                  ? `Created by ${getUserLabel(embellishment.created_by_user, embellishment.created_by_id)}`
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
          const embellishment = row.original
          const hasUpdateMetadata = Boolean(embellishment.updated_by_id || embellishment.updated_by_user)

          return (
            <div className="space-y-1">
              {hasUpdateMetadata ? (
                <>
                  <p className="text-xs text-slate-700 dark:text-slate-200">
                    {formatDate(embellishment.updated_at)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {getUserLabel(embellishment.updated_by_user, embellishment.updated_by_id)
                      ? `Updated by ${getUserLabel(embellishment.updated_by_user, embellishment.updated_by_id)}`
                      : "No editor metadata"}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Not edited yet
                </p>
              )}
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const embellishment = row.original
          const hasActions = canUpdateEmbellishment || canDeleteEmbellishment

          if (!hasActions) {
            return (
              <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">
                No actions
              </div>
            )
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
                <DropdownMenuContent align="end" className="w-52">
                  {canUpdateEmbellishment ? (
                    <DropdownMenuItem onSelect={() => onEditEmbellishment(embellishment.id)}>
                      Edit embellishment
                    </DropdownMenuItem>
                  ) : null}
                  {canUpdateEmbellishment && canDeleteEmbellishment ? <DropdownMenuSeparator /> : null}
                  {canDeleteEmbellishment ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => onDeleteEmbellishment(embellishment)}>
                      Delete embellishment
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [canDeleteEmbellishment, canUpdateEmbellishment, onDeleteEmbellishment, onEditEmbellishment],
  )

  const table = useReactTable({
    data: embellishments,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
        <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription className="text-xs">
                Search by embellishment name or remarks.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">
              {filterCount} active filter{filterCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-0 sm:px-2">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              onActiveFiltersChange(draftFilters)
              onPageChange(1)
            }}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <div className="min-w-0 space-y-1">
              <label htmlFor="filterEmbellishmentName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Embellishment name
              </label>
              <Input
                id="filterEmbellishmentName"
                value={draftFilters.name}
                className="h-9 rounded-md px-2 text-xs"
                onChange={(event) =>
                  onDraftFiltersChange({
                    ...draftFilters,
                    name: event.target.value,
                  })
                }
                placeholder="Input embellishment name"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <label htmlFor="filterEmbellishmentRemarks" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Remarks
              </label>
              <Input
                id="filterEmbellishmentRemarks"
                value={draftFilters.remarks}
                className="h-9 rounded-md px-2 text-xs"
                onChange={(event) =>
                  onDraftFiltersChange({
                    ...draftFilters,
                    remarks: event.target.value,
                  })
                }
                placeholder="Input remarks"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-2">
              <Button type="submit" className="w-full rounded-xl sm:w-auto">
                <Search className="size-3.5" />
                Search
              </Button>
              <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={onResetFilters}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
        <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Embellishments table</CardTitle>
              <CardDescription>{pageSummary}</CardDescription>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="lg:hidden">
            {loadingEmbellishments ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 rounded-2xl" />
                ))}
              </div>
            ) : embellishments.length > 0 ? (
              <div className="space-y-3 p-4">
                {embellishments.map((embellishment) => {
                  const tone = embellishmentBadgeTone(embellishment)
                  const label = embellishment.deleted_at ? "Deleted" : embellishment.isActive === "N" ? "Inactive" : "Active"

                  return (
                    <article key={embellishment.id} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                              {(embellishment.name?.trim() || "?").charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                                {embellishment.name}
                              </p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                ID #{embellishment.id}
                              </p>
                            </div>
                          </div>
                        </div>

                        {canUpdateEmbellishment || canDeleteEmbellishment ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                                <MoreHorizontal className="size-3.5" />
                                <span className="sr-only">Open actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {canUpdateEmbellishment ? (
                                <DropdownMenuItem onSelect={() => onEditEmbellishment(embellishment.id)}>
                                  Edit embellishment
                                </DropdownMenuItem>
                              ) : null}
                              {canUpdateEmbellishment && canDeleteEmbellishment ? <DropdownMenuSeparator /> : null}
                              {canDeleteEmbellishment ? (
                                <DropdownMenuItem variant="destructive" onSelect={() => onDeleteEmbellishment(embellishment)}>
                                  Delete embellishment
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
                      </div>
                      <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {embellishment.remarks || "No remarks provided."}
                      </p>
                      <div className="mt-4 flex items-start justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>Created: {formatDate(embellishment.created_at)}</span>
                        <span>#{embellishment.id}</span>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="p-4">
                <EmptyState
                  title="No embellishments found"
                  description={
                    filtersActive
                      ? "Try clearing or relaxing the current filters."
                      : canCreateEmbellishment
                        ? "Create the first merchandising embellishment to get started."
                        : "No embellishment records are available for the selected organization."
                  }
                  actionLabel={filtersActive || !canCreateEmbellishment ? "Reset filters" : "New embellishment"}
                  onAction={filtersActive || !canCreateEmbellishment ? onResetFilters : onCreateEmbellishment}
                />
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pageSummary}
              </p>
              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(1)} disabled={loadingEmbellishments || page <= 1}>
                  <ChevronsLeft className="size-3.5" />
                  <span className="sr-only">Go to first page</span>
                </Button>
                <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.max(1, current - 1))} disabled={loadingEmbellishments || page <= 1}>
                  <ChevronLeft className="size-3.5" />
                  <span className="sr-only">Previous page</span>
                </Button>
                <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.min(meta?.totalPages ?? 1, current + 1))} disabled={loadingEmbellishments || page >= (meta?.totalPages ?? 1)}>
                  <ChevronRight className="size-3.5" />
                  <span className="sr-only">Next page</span>
                </Button>
                <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(meta?.totalPages ?? 1)} disabled={loadingEmbellishments || page >= (meta?.totalPages ?? 1)}>
                  <ChevronsRight className="size-3.5" />
                  <span className="sr-only">Go to last page</span>
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
              isLoading={loadingEmbellishments}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={(nextPage) => onPageChange(nextPage)}
              onPageSizeChange={(nextPageSize) => {
                onLimitChange(nextPageSize)
                onPageChange(1)
              }}
              emptyState={
                <EmptyState
                  title="No embellishments found"
                  description={
                    filtersActive
                      ? "Try clearing or relaxing the current filters."
                      : canCreateEmbellishment
                        ? "Create the first merchandising embellishment to get started."
                        : "No embellishment records are available for the selected organization."
                  }
                  actionLabel={filtersActive || !canCreateEmbellishment ? "Reset filters" : "New embellishment"}
                  onAction={filtersActive || !canCreateEmbellishment ? onResetFilters : onCreateEmbellishment}
                />
              }
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
