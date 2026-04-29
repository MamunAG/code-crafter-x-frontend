"use client"

import { useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  RefreshCcw,
  Search,
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
import { Input } from "@/components/ui/input"

import type { MenuRecord, PaginationMeta } from "../menu.types"

type DeletedMenuActionMode = "restore" | "permanent"

type DeletedMenusCardProps = {
  deletedMenus: MenuRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeletedMenus: boolean
  deletedError: string
  deletedDraftFilters: { menuName: string; isActive: "all" | "active" | "inactive" }
  deletedActiveFilters: { menuName: string; isActive: "all" | "active" | "inactive" }
  onDeletedDraftFiltersChange: (nextValues: { menuName: string; isActive: "all" | "active" | "inactive" }) => void
  onDeletedActiveFiltersChange: (nextValues: { menuName: string; isActive: "all" | "active" | "inactive" }) => void
  onDeletedPageChange: (nextPage: number) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (menu: MenuRecord, mode: DeletedMenuActionMode) => void
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

export function DeletedMenusCard({
  deletedMenus,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeletedMenus,
  deletedError,
  deletedDraftFilters,
  deletedActiveFilters,
  onDeletedDraftFiltersChange,
  onDeletedActiveFiltersChange,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  onRetry,
}: DeletedMenusCardProps) {
  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) {
      return "No deleted menus found"
    }

    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedFilterCount = useMemo(
    () => [deletedDraftFilters.menuName].filter((value) => value.trim()).length,
    [deletedDraftFilters],
  )

  const deletedFiltersActive = Boolean(
    deletedActiveFilters.menuName || deletedActiveFilters.isActive !== "all",
  )

  const deletedColumns = useMemo<ColumnDef<MenuRecord>[]>(() => [
      {
        id: "menu",
        header: "Menu",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">
              {row.original.menuName}
            </p>
            <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
              {row.original.moduleEntry?.moduleName || "Module not set"}
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
        const menu = row.original

        return (
          <div className="pr-4 text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                  <MoreHorizontal className="size-3.5" />
                  <span className="sr-only">Open deleted menu actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => onOpenAction(menu, "restore")}>
                  Restore menu
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(menu, "permanent")}>
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
    data: deletedMenus,
    columns: deletedColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Deleted menus</CardTitle>
            <CardDescription>
              Restore soft deleted menus or remove them permanently.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
            {deletedMeta?.total ?? deletedMenus.length} deleted
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {deletedError ? (
          <div className="p-4 sm:p-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <p className="font-semibold">Unable to load deleted menus</p>
              <p className="mt-1 leading-6">{deletedError}</p>
              <Button type="button" variant="outline" className="mt-4 rounded-xl" onClick={onRetry}>
                <RefreshCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-slate-200/70 p-4 dark:border-white/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="grid w-full gap-3 sm:grid-cols-1 lg:max-w-2xl">
                    <div className="space-y-1">
                      <label htmlFor="deletedMenuName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Menu name
                      </label>
                    <Input
                      id="deletedMenuName"
                      value={deletedDraftFilters.menuName}
                      className="h-9 rounded-md px-2 text-xs"
                      onChange={(event) =>
                        onDeletedDraftFiltersChange({
                          ...deletedDraftFilters,
                          menuName: event.target.value,
                        })
                      }
                      placeholder="Dashboard"
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
                      const cleared = { menuName: "", isActive: "all" as const }
                      onDeletedDraftFiltersChange(cleared)
                      onDeletedActiveFiltersChange(cleared)
                      onDeletedPageChange(1)
                    }}
                    disabled={!deletedFiltersActive && deletedFilterCount === 0}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                  {deletedFilterCount} active filter{deletedFilterCount === 1 ? "" : "s"}
                </Badge>
                <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
              </div>
            </div>
            <div className="lg:hidden">
              {loadingDeletedMenus ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 rounded-2xl" />
                  ))}
                </div>
              ) : deletedMenus.length > 0 ? (
                <div className="space-y-3 p-4">
                  {deletedMenus.map((menu) => (
                    <article
                      key={menu.id}
                      className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                            {menu.menuName}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {menu.moduleEntry?.moduleName || "Module not set"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant={menu.isActive ? "secondary" : "outline"} className="rounded-full px-3 py-1">
                              {menu.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline" className="rounded-full px-3 py-1">
                              Order {menu.displayOrder}
                            </Badge>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                              <MoreHorizontal className="size-3.5" />
                              <span className="sr-only">Open deleted menu actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onSelect={() => onOpenAction(menu, "restore")}>
                              Restore menu
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => onOpenAction(menu, "permanent")}
                            >
                              Delete permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                        Deleted: {formatDate(menu.deleted_at)}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState
                    title="No deleted menus found"
                    description="Soft deleted menus will appear here when users remove them."
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
                    disabled={loadingDeletedMenus || deletedPage <= 1}
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
                    disabled={loadingDeletedMenus || deletedPage <= 1}
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
                    disabled={loadingDeletedMenus || deletedPage >= (deletedMeta?.totalPages ?? 1)}
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
                    disabled={loadingDeletedMenus || deletedPage >= (deletedMeta?.totalPages ?? 1)}
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
                isLoading={loadingDeletedMenus}
                pageSizeOptions={[5, 10, 25, 50]}
                onPageChange={(nextPage) => onDeletedPageChange(nextPage)}
                onPageSizeChange={(nextPageSize) => {
                  onDeletedLimitChange(nextPageSize)
                  onDeletedPageChange(1)
                }}
                emptyState={
                  <EmptyState
                    title="No deleted menus found"
                    description="Soft deleted menus will appear here when users remove them."
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
