"use client"

import { useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  RefreshCcw,
} from "lucide-react"
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table"

import { AppDataTable } from "@/components/app-data-table"
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
import { Skeleton } from "@/components/ui/skeleton"

import type { ModuleEntryRecord, PaginationMeta } from "../module-entry.types"

type DeletedModuleEntryActionMode = "restore" | "permanent"

type DeletedModuleEntriesCardProps = {
  deletedModuleEntries: ModuleEntryRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeletedModuleEntries: boolean
  deletedError: string
  onDeletedPageChange: (nextPage: number) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (moduleEntry: ModuleEntryRecord, mode: DeletedModuleEntryActionMode) => void
  onRetry: () => void
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

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </div>
  )
}

export function DeletedModuleEntriesCard({
  deletedModuleEntries,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeletedModuleEntries,
  deletedError,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  onRetry,
}: DeletedModuleEntriesCardProps) {
  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) {
      return "No deleted module entries found"
    }

    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedColumns = useMemo<ColumnDef<ModuleEntryRecord>[]>(() => [
    {
      id: "module",
      header: "Module",
      cell: ({ row }) => (
        <div className="pl-4">
          <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">
            {row.original.moduleName}
          </p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {row.original.moduleKey}
          </p>
        </div>
      ),
    },
    {
      id: "order",
      header: "Order",
      cell: ({ row }) => (
        <Badge variant="outline" className="rounded-full px-3 py-1">
          {row.original.displayOrder}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "secondary" : "outline"} className="rounded-full px-3 py-1">
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "deleted",
      header: "Deleted",
      cell: ({ row }) => (
        <span className="text-xs text-slate-700 dark:text-slate-200">
          {formatDate(row.original.deleted_at)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="pr-4">Actions</span>,
      cell: ({ row }) => {
        const moduleEntry = row.original

        return (
          <div className="pr-4 text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                  <MoreHorizontal className="size-3.5" />
                  <span className="sr-only">Open deleted module entry actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => onOpenAction(moduleEntry, "restore")}>
                  Restore module
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onOpenAction(moduleEntry, "permanent")}
                >
                  Delete permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [onOpenAction])

  const deletedTable = useReactTable({
    data: deletedModuleEntries,
    columns: deletedColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Deleted module entries</CardTitle>
            <CardDescription>
              Restore soft deleted module entries or remove them permanently.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
            {deletedMeta?.total ?? deletedModuleEntries.length} deleted
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {deletedError ? (
          <div className="p-4 sm:p-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <p className="font-semibold">Unable to load deleted module entries</p>
              <p className="mt-1 leading-6">{deletedError}</p>
              <Button type="button" variant="outline" className="mt-4 rounded-xl" onClick={onRetry}>
                <RefreshCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="lg:hidden">
              {loadingDeletedModuleEntries ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 rounded-2xl" />
                  ))}
                </div>
              ) : deletedModuleEntries.length > 0 ? (
                <div className="space-y-3 p-4">
                  {deletedModuleEntries.map((moduleEntry) => (
                    <article
                      key={moduleEntry.id}
                      className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                            {moduleEntry.moduleName}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {moduleEntry.moduleKey}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant={moduleEntry.isActive ? "secondary" : "outline"} className="rounded-full px-3 py-1">
                              {moduleEntry.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline" className="rounded-full px-3 py-1">
                              Order {moduleEntry.displayOrder}
                            </Badge>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                              <MoreHorizontal className="size-3.5" />
                              <span className="sr-only">Open deleted module entry actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onSelect={() => onOpenAction(moduleEntry, "restore")}>
                              Restore module
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => onOpenAction(moduleEntry, "permanent")}
                            >
                              Delete permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                        Deleted: {formatDate(moduleEntry.deleted_at)}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState
                    title="No deleted module entries found"
                    description="Soft deleted module entries will appear here when users remove them."
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-xl"
                    onClick={() => onDeletedPageChange(1)}
                    disabled={loadingDeletedModuleEntries || deletedPage <= 1}
                  >
                    <ChevronsLeft className="size-3.5" />
                    <span className="sr-only">Go to first deleted page</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-xl"
                    onClick={() => onDeletedPageChange(Math.max(1, deletedPage - 1))}
                    disabled={loadingDeletedModuleEntries || deletedPage <= 1}
                  >
                    <ChevronLeft className="size-3.5" />
                    <span className="sr-only">Previous deleted page</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-xl"
                    onClick={() => onDeletedPageChange(Math.min(deletedMeta?.totalPages ?? 1, deletedPage + 1))}
                    disabled={loadingDeletedModuleEntries || deletedPage >= (deletedMeta?.totalPages ?? 1)}
                  >
                    <ChevronRight className="size-3.5" />
                    <span className="sr-only">Next deleted page</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-xl"
                    onClick={() => onDeletedPageChange(deletedMeta?.totalPages ?? 1)}
                    disabled={loadingDeletedModuleEntries || deletedPage >= (deletedMeta?.totalPages ?? 1)}
                  >
                    <ChevronsRight className="size-3.5" />
                    <span className="sr-only">Go to last deleted page</span>
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
                isLoading={loadingDeletedModuleEntries}
                pageSizeOptions={[5, 10, 25, 50]}
                onPageChange={(nextPage) => onDeletedPageChange(nextPage)}
                onPageSizeChange={(nextPageSize) => {
                  onDeletedLimitChange(nextPageSize)
                  onDeletedPageChange(1)
                }}
                emptyState={
                  <EmptyState
                    title="No deleted module entries found"
                    description="Soft deleted module entries will appear here when users remove them."
                  />
                }
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
