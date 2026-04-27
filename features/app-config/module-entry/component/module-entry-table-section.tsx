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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import type { ModuleEntryFilterValues, ModuleEntryRecord, PaginationMeta } from "../module-entry.types"

type ModuleEntryTableSectionProps = {
  moduleEntries: ModuleEntryRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loadingModuleEntries: boolean
  draftFilters: ModuleEntryFilterValues
  activeFilters: ModuleEntryFilterValues
  onDraftFiltersChange: (nextValues: ModuleEntryFilterValues) => void
  onActiveFiltersChange: (nextValues: ModuleEntryFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreateModuleEntry: () => void
  onEditModuleEntry: (moduleEntry: ModuleEntryRecord) => void
  onDeleteModuleEntry: (moduleEntry: ModuleEntryRecord) => void
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

function statusTone(moduleEntry: ModuleEntryRecord) {
  return moduleEntry.isActive ? "secondary" : "outline"
}

function statusLabel(moduleEntry: ModuleEntryRecord) {
  return moduleEntry.isActive ? "Active" : "Inactive"
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

export function ModuleEntryTableSection({
  moduleEntries,
  meta,
  page,
  limit,
  loadingModuleEntries,
  draftFilters,
  activeFilters,
  onDraftFiltersChange,
  onActiveFiltersChange,
  onPageChange,
  onLimitChange,
  onCreateModuleEntry,
  onEditModuleEntry,
  onDeleteModuleEntry,
  onResetFilters,
}: ModuleEntryTableSectionProps) {
  const filterCount = useMemo(
    () => [draftFilters.moduleName, draftFilters.moduleKey].filter((value) => value.trim()).length,
    [draftFilters],
  )

  const filtersActive = Boolean(
    activeFilters.moduleName || activeFilters.moduleKey || activeFilters.isActive !== "all",
  )

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) {
      return "No module entries found"
    }

    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<ModuleEntryRecord>[]>(
    () => [
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
          const moduleEntry = row.original

          return (
            <div className="pr-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open module entry actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => onEditModuleEntry(moduleEntry)}>
                    Edit module
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => onDeleteModuleEntry(moduleEntry)}>
                    Delete module
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [onDeleteModuleEntry, onEditModuleEntry],
  )

  const table = useReactTable({
    data: moduleEntries,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const emptyState = (
    <EmptyState
      title="No module entries found"
      description={
        filtersActive
          ? "Try clearing or relaxing the current filters."
          : "Create the first application module entry to get started."
      }
      actionLabel={filtersActive ? "Reset filters" : "New module"}
      onAction={filtersActive ? onResetFilters : onCreateModuleEntry}
    />
  )

  return (
    <>
      <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
        <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription className="text-xs">
                Search by module name, key, or active status.
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
              <label htmlFor="filterModuleName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Module name
              </label>
              <Input
                id="filterModuleName"
                value={draftFilters.moduleName}
                className="h-9 rounded-md px-2 text-xs"
                onChange={(event) =>
                  onDraftFiltersChange({
                    ...draftFilters,
                    moduleName: event.target.value,
                  })
                }
                placeholder="Merchandising"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <label htmlFor="filterModuleKey" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Module key
              </label>
              <Input
                id="filterModuleKey"
                value={draftFilters.moduleKey}
                className="h-9 rounded-md px-2 text-xs"
                onChange={(event) =>
                  onDraftFiltersChange({
                    ...draftFilters,
                    moduleKey: event.target.value,
                  })
                }
                placeholder="merchandising"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <label htmlFor="filterModuleStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Active status
              </label>
              <select
                id="filterModuleStatus"
                value={draftFilters.isActive}
                onChange={(event) =>
                  onDraftFiltersChange({
                    ...draftFilters,
                    isActive: event.target.value as ModuleEntryFilterValues["isActive"],
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
              <CardTitle className="text-lg">Module entries table</CardTitle>
              <CardDescription>{pageSummary}</CardDescription>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="lg:hidden">
            {loadingModuleEntries ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 rounded-2xl" />
                ))}
              </div>
            ) : moduleEntries.length > 0 ? (
              <div className="space-y-3 p-4">
                {moduleEntries.map((moduleEntry) => (
                  <article
                    key={moduleEntry.id}
                    className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                          {moduleEntry.moduleName}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {moduleEntry.moduleKey}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {moduleEntry.description?.trim() || "No description provided."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={statusTone(moduleEntry)} className="rounded-full px-3 py-1">
                            {statusLabel(moduleEntry)}
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
                            <span className="sr-only">Open module entry actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onSelect={() => onEditModuleEntry(moduleEntry)}>
                            Edit module
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => onDeleteModuleEntry(moduleEntry)}>
                            Delete module
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-4">{emptyState}</div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">{pageSummary}</p>
              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(1)} disabled={loadingModuleEntries || page <= 1}>
                  <ChevronsLeft className="size-3.5" />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.max(1, current - 1))} disabled={loadingModuleEntries || page <= 1}>
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.min(meta?.totalPages ?? 1, current + 1))} disabled={loadingModuleEntries || page >= (meta?.totalPages ?? 1)}>
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(meta?.totalPages ?? 1)} disabled={loadingModuleEntries || page >= (meta?.totalPages ?? 1)}>
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
              isLoading={loadingModuleEntries}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={(nextPage) => onPageChange(nextPage)}
              onPageSizeChange={(nextPageSize) => {
                onLimitChange(nextPageSize)
                onPageChange(1)
              }}
              emptyState={emptyState}
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
