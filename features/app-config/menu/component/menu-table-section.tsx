"use client"

import { useMemo } from "react"

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Search,
  SquarePen,
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

import type { MenuFilterValues, MenuRecord, PaginationMeta } from "../menu.types"

type MenuTableSectionProps = {
  menus: MenuRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loadingMenus: boolean
  draftFilters: MenuFilterValues
  activeFilters: MenuFilterValues
  onDraftFiltersChange: (nextValues: MenuFilterValues) => void
  onActiveFiltersChange: (nextValues: MenuFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreateMenu: () => void
  onEditMenu: (menu: MenuRecord) => void
  onDeleteMenu: (menu: MenuRecord) => void
  onResetFilters: () => void
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

function statusTone(menu: MenuRecord) {
  return menu.isActive ? "secondary" : "outline"
}

function statusLabel(menu: MenuRecord) {
  return menu.isActive ? "Active" : "Inactive"
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
        <SquarePen className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">
        {description}
      </p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">
        {actionLabel}
      </Button>
    </div>
  )
}

export function MenuTableSection({
  menus,
  meta,
  page,
  limit,
  loadingMenus,
  draftFilters,
  activeFilters,
  onDraftFiltersChange,
  onActiveFiltersChange,
  onPageChange,
  onLimitChange,
  onCreateMenu,
  onEditMenu,
  onDeleteMenu,
  onResetFilters,
}: MenuTableSectionProps) {
  const filterCount = useMemo(
    () => [draftFilters.menuName, draftFilters.menuPath].filter((value) => value.trim()).length,
    [draftFilters],
  )

  const filtersActive = Boolean(
    activeFilters.menuName || activeFilters.menuPath || activeFilters.isActive !== "all",
  )

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) {
      return "No menu entries found"
    }

    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<MenuRecord>[]>(
    () => [
      {
        id: "menu",
        header: "Menu",
        cell: ({ row }) => (
          <div className="pl-4">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">
                {row.original.menuName}
              </p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {row.original.menuPath}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "description",
        header: "Description",
        cell: ({ row }) => (
          <p className="line-clamp-2 max-w-[24rem] whitespace-normal text-xs leading-5 text-slate-600 dark:text-slate-300">
            {row.original.description?.trim() || "No description provided."}
          </p>
        ),
      },
      {
        id: "displayOrder",
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
          <Badge variant={statusTone(row.original)} className="rounded-full px-3 py-1">
            {statusLabel(row.original)}
          </Badge>
        ),
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-xs text-slate-700 dark:text-slate-200">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "updated",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-xs text-slate-700 dark:text-slate-200">
            {formatDate(row.original.updated_at)}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                  >
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open menu actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => onEditMenu(menu)}>
                    Edit menu
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => onDeleteMenu(menu)}>
                    Delete menu
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [onDeleteMenu, onEditMenu],
  )

  const table = useReactTable({
    data: menus,
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
                Search by menu name, path, or active status.
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
              <label htmlFor="filterMenuName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Menu name
              </label>
              <Input
                id="filterMenuName"
                value={draftFilters.menuName}
                className="h-9 rounded-md px-2 text-xs"
                onChange={(event) =>
                  onDraftFiltersChange({
                    ...draftFilters,
                    menuName: event.target.value,
                  })
                }
                placeholder="Dashboard"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <label htmlFor="filterMenuPath" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Menu path
              </label>
              <Input
                id="filterMenuPath"
                value={draftFilters.menuPath}
                className="h-9 rounded-md px-2 text-xs"
                onChange={(event) =>
                  onDraftFiltersChange({
                    ...draftFilters,
                    menuPath: event.target.value,
                  })
                }
                placeholder="/dashboard"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <label htmlFor="filterMenuStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Active status
              </label>
              <select
                id="filterMenuStatus"
                value={draftFilters.isActive}
                onChange={(event) =>
                  onDraftFiltersChange({
                    ...draftFilters,
                    isActive: event.target.value as MenuFilterValues["isActive"],
                  })
                }
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none transition-colors focus:border-slate-400 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-1">
              <Button type="submit" className="w-full rounded-xl sm:w-auto">
                <Search className="size-3.5" />
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl sm:w-auto"
                onClick={onResetFilters}
              >
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
              <CardTitle className="text-lg">Menus table</CardTitle>
              <CardDescription>{pageSummary}</CardDescription>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="lg:hidden">
            {loadingMenus ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 rounded-2xl" />
                ))}
              </div>
            ) : menus.length > 0 ? (
              <div className="space-y-3 p-4">
                {menus.map((menu) => (
                  <article
                    key={menu.id}
                    className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                            {menu.menuName}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {menu.menuPath}
                          </p>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {menu.description?.trim() || "No description provided."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={statusTone(menu)} className="rounded-full px-3 py-1">
                            {statusLabel(menu)}
                          </Badge>
                          <Badge variant="outline" className="rounded-full px-3 py-1">
                            Order {menu.displayOrder}
                          </Badge>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full"
                          >
                            <MoreHorizontal className="size-3.5" />
                            <span className="sr-only">Open menu actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onSelect={() => onEditMenu(menu)}>
                            Edit menu
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => onDeleteMenu(menu)}>
                            Delete menu
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-3 flex items-start justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <div className="space-y-1">
                        <span className="block">Created: {formatDate(menu.created_at)}</span>
                        <span className="block">Updated: {formatDate(menu.updated_at)}</span>
                      </div>
                      <span>#{menu.id}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-4">
                <EmptyState
                  title="No menus found"
                  description={
                    filtersActive
                      ? "Try clearing or relaxing the current filters."
                      : "Create the first application menu entry to get started."
                  }
                  actionLabel={filtersActive ? "Reset filters" : "New menu"}
                  onAction={filtersActive ? onResetFilters : onCreateMenu}
                />
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">{pageSummary}</p>
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl"
                  onClick={() => onPageChange(1)}
                  disabled={loadingMenus || page <= 1}
                >
                  <ChevronsLeft className="size-3.5" />
                  <span className="sr-only">Go to first page</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl"
                  onClick={() => onPageChange((current) => Math.max(1, current - 1))}
                  disabled={loadingMenus || page <= 1}
                >
                  <ChevronLeft className="size-3.5" />
                  <span className="sr-only">Previous page</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl"
                  onClick={() => onPageChange((current) => Math.min(meta?.totalPages ?? 1, current + 1))}
                  disabled={loadingMenus || page >= (meta?.totalPages ?? 1)}
                >
                  <ChevronRight className="size-3.5" />
                  <span className="sr-only">Next page</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl"
                  onClick={() => onPageChange(meta?.totalPages ?? 1)}
                  disabled={loadingMenus || page >= (meta?.totalPages ?? 1)}
                >
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
              isLoading={loadingMenus}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={(nextPage) => onPageChange(nextPage)}
              onPageSizeChange={(nextPageSize) => {
                onLimitChange(nextPageSize)
                onPageChange(1)
              }}
              emptyState={
                <EmptyState
                  title="No menus found"
                  description={
                    filtersActive
                      ? "Try clearing or relaxing the current filters."
                      : "Create the first application menu entry to get started."
                  }
                  actionLabel={filtersActive ? "Reset filters" : "New menu"}
                  onAction={filtersActive ? onResetFilters : onCreateMenu}
                />
              }
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
