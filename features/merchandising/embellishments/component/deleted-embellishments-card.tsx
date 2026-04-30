"use client"

import { useMemo } from "react"
import {
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

type DeletedEmbellishmentActionMode = "restore" | "permanent"

type DeletedEmbellishmentsCardProps = {
  deletedEmbellishments: EmbellishmentRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeletedEmbellishments: boolean
  deletedError: string
  deletedDraftFilters: EmbellishmentFilterValues
  deletedActiveFilters: EmbellishmentFilterValues
  onDeletedDraftFiltersChange: (nextValues: EmbellishmentFilterValues) => void
  onDeletedActiveFiltersChange: (nextValues: EmbellishmentFilterValues) => void
  onDeletedPageChange: (nextPage: number) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (embellishment: EmbellishmentRecord, mode: DeletedEmbellishmentActionMode) => void
  canRestoreEmbellishment: boolean
  canPermanentlyDeleteEmbellishment: boolean
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

function getUserLabel(user?: { name?: string | null } | null, fallback?: string | null) {
  return user?.name?.trim() || fallback?.trim() || ""
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </div>
  )
}

export function DeletedEmbellishmentsCard({
  deletedEmbellishments,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeletedEmbellishments,
  deletedError,
  deletedDraftFilters,
  deletedActiveFilters,
  onDeletedDraftFiltersChange,
  onDeletedActiveFiltersChange,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  canRestoreEmbellishment,
  canPermanentlyDeleteEmbellishment,
}: DeletedEmbellishmentsCardProps) {
  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) {
      return "No deleted embellishments found"
    }

    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedFilterCount = useMemo(
    () => [deletedDraftFilters.name, deletedDraftFilters.remarks].filter((value) => value.trim()).length,
    [deletedDraftFilters],
  )

  const deletedFiltersActive = Boolean(deletedActiveFilters.name || deletedActiveFilters.remarks)

  const deletedColumns = useMemo<ColumnDef<EmbellishmentRecord>[]>(
    () => [
      {
        id: "embellishment",
        header: "Embellishment",
        cell: ({ row }) => {
          const embellishment = row.original

          return (
            <div className="pl-4">
              <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">
                {embellishment.name}
              </p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                ID #{embellishment.id}
              </p>
            </div>
          )
        },
      },
      {
        id: "remarks",
        header: "Remarks",
        cell: ({ row }) => (
          <p className="line-clamp-2 max-w-[24rem] whitespace-normal text-xs leading-5 text-slate-600 dark:text-slate-300">
            {row.original.remarks || "No remarks provided."}
          </p>
        ),
      },
      {
        id: "deleted",
        header: "Deleted",
        cell: ({ row }) => {
          const embellishment = row.original

          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">
                {formatDate(embellishment.deleted_at)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserLabel(embellishment.deleted_by_user, embellishment.deleted_by_id)
                  ? `Deleted by ${getUserLabel(embellishment.deleted_by_user, embellishment.deleted_by_id)}`
                  : "Deleted item"}
              </p>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const embellishment = row.original
          const hasActions = canRestoreEmbellishment || canPermanentlyDeleteEmbellishment

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
                    <span className="sr-only">Open deleted item actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {canRestoreEmbellishment ? (
                    <DropdownMenuItem onSelect={() => onOpenAction(embellishment, "restore")}>
                      Restore embellishment
                    </DropdownMenuItem>
                  ) : null}
                  {canRestoreEmbellishment && canPermanentlyDeleteEmbellishment ? <DropdownMenuSeparator /> : null}
                  {canPermanentlyDeleteEmbellishment ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(embellishment, "permanent")}>
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
    [canPermanentlyDeleteEmbellishment, canRestoreEmbellishment, onOpenAction],
  )

  const deletedTable = useReactTable({
    data: deletedEmbellishments,
    columns: deletedColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Deleted embellishments</CardTitle>
            <CardDescription>
              Restore old soft deleted embellishments or remove them permanently.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
            {deletedMeta?.total ?? deletedEmbellishments.length} deleted
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-b border-slate-200/70 p-4 dark:border-white/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-2xl">
              <div className="space-y-1">
                <label htmlFor="deletedEmbellishmentName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Embellishment name
                </label>
                <Input
                  id="deletedEmbellishmentName"
                  value={deletedDraftFilters.name}
                  className="h-9 rounded-md px-2 text-xs"
                  onChange={(event) =>
                    onDeletedDraftFiltersChange({
                      ...deletedDraftFilters,
                      name: event.target.value,
                    })
                  }
                  placeholder="Input embellishment name"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="deletedEmbellishmentRemarks" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Remarks
                </label>
                <Input
                  id="deletedEmbellishmentRemarks"
                  value={deletedDraftFilters.remarks}
                  className="h-9 rounded-md px-2 text-xs"
                  onChange={(event) =>
                    onDeletedDraftFiltersChange({
                      ...deletedDraftFilters,
                      remarks: event.target.value,
                    })
                  }
                  placeholder="Input remarks"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="w-full rounded-xl sm:w-auto"
                onClick={() => {
                  onDeletedActiveFiltersChange(deletedDraftFilters)
                  onDeletedPageChange(1)
                }}
              >
                <Search className="size-3.5" />
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl sm:w-auto"
                onClick={() => {
                  const cleared = { name: "", remarks: "" }
                  onDeletedDraftFiltersChange(cleared)
                  onDeletedActiveFiltersChange(cleared)
                  onDeletedPageChange(1)
                }}
              >
                Reset
              </Button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
              {deletedFilterCount} active filter{deletedFilterCount === 1 ? "" : "s"}
            </Badge>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {deletedPageSummary}
            </p>
          </div>
        </div>

        {deletedError ? (
          <div className="p-4">
            <EmptyState title="Unable to load deleted embellishments" description={deletedError} />
          </div>
        ) : null}

        {!deletedError ? (
          <>
            <div className="lg:hidden">
              {loadingDeletedEmbellishments ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 rounded-2xl" />
                  ))}
                </div>
              ) : deletedEmbellishments.length > 0 ? (
                <div className="space-y-3 p-4">
                  {deletedEmbellishments.map((embellishment) => (
                    <article key={embellishment.id} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                            {embellishment.name}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            ID #{embellishment.id}
                          </p>
                        </div>

                        {canRestoreEmbellishment || canPermanentlyDeleteEmbellishment ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                                <MoreHorizontal className="size-3.5" />
                                <span className="sr-only">Open deleted item actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {canRestoreEmbellishment ? (
                                <DropdownMenuItem onSelect={() => onOpenAction(embellishment, "restore")}>
                                  Restore embellishment
                                </DropdownMenuItem>
                              ) : null}
                              {canRestoreEmbellishment && canPermanentlyDeleteEmbellishment ? <DropdownMenuSeparator /> : null}
                              {canPermanentlyDeleteEmbellishment ? (
                                <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(embellishment, "permanent")}>
                                  Delete permanently
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>

                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        Deleted: {formatDate(embellishment.deleted_at)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {getUserLabel(embellishment.deleted_by_user, embellishment.deleted_by_id)
                          ? `Deleted by ${getUserLabel(embellishment.deleted_by_user, embellishment.deleted_by_id)}`
                          : "Deleted item"}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState
                    title="No deleted embellishments found"
                    description={
                      deletedFiltersActive
                        ? "Try clearing or relaxing the current filters."
                        : "Soft deleted embellishments will appear here when users remove them."
                    }
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {deletedPageSummary}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(1)} disabled={loadingDeletedEmbellishments || deletedPage <= 1}>
                    <ChevronsLeft className="size-3.5" />
                    <span className="sr-only">Go to first page</span>
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.max(1, deletedPage - 1))} disabled={loadingDeletedEmbellishments || deletedPage <= 1}>
                    <ChevronLeft className="size-3.5" />
                    <span className="sr-only">Previous page</span>
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.min(deletedMeta?.totalPages ?? 1, deletedPage + 1))} disabled={loadingDeletedEmbellishments || deletedPage >= (deletedMeta?.totalPages ?? 1)}>
                    <ChevronRight className="size-3.5" />
                    <span className="sr-only">Next page</span>
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(deletedMeta?.totalPages ?? 1)} disabled={loadingDeletedEmbellishments || deletedPage >= (deletedMeta?.totalPages ?? 1)}>
                    <ChevronsRight className="size-3.5" />
                    <span className="sr-only">Go to last page</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <AppDataTable
                table={deletedTable}
                pageSummary={deletedPageSummary}
                page={deletedPage}
                totalPages={deletedMeta?.totalPages ?? 1}
                pageSize={deletedLimit}
                isLoading={loadingDeletedEmbellishments}
                pageSizeOptions={[5, 10, 25, 50]}
                onPageChange={(nextPage) => onDeletedPageChange(nextPage)}
                onPageSizeChange={(nextPageSize) => {
                  onDeletedLimitChange(nextPageSize)
                  onDeletedPageChange(1)
                }}
                emptyState={
                  <EmptyState
                    title="No deleted embellishments found"
                    description={
                      deletedFiltersActive
                        ? "Try clearing or relaxing the current filters."
                        : "Soft deleted embellishments will appear here when users remove them."
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
