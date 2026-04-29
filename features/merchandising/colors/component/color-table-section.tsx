"use client"

import { useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Paintbrush,
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

import type { ColorFilterValues, ColorRecord, PaginationMeta } from "../color.types"

type ColorTableSectionProps = {
  colors: ColorRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loadingColors: boolean
  draftFilters: ColorFilterValues
  activeFilters: ColorFilterValues
  onDraftFiltersChange: (nextValues: ColorFilterValues) => void
  onActiveFiltersChange: (nextValues: ColorFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreateColor: () => void
  onEditColor: (colorId: number) => void
  onDeleteColor: (color: ColorRecord) => void
  onResetFilters: () => void
  canCreateColor: boolean
  canUpdateColor: boolean
  canDeleteColor: boolean
}

const NEUTRAL_COLOR_SWATCH = "#9CA3AF"

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

function colorBadgeTone(color?: ColorRecord | null) {
  if (!color) {
    return "outline" as const
  }

  if (color.deleted_at) {
    return "destructive" as const
  }

  return color.isActive === false ? "outline" : "secondary"
}

function getColorLabel(color: ColorRecord) {
  return color.colorDisplayName?.trim() || color.colorName
}

function isValidHexColorCode(value: string) {
  return /^#?[0-9A-Fa-f]{6}$/.test(value.trim())
}

function normalizeHexColorCode(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return ""
  }

  return trimmed.startsWith("#") ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`
}

function getColorSwatchColor(color: ColorRecord) {
  if (color.colorHexCode && isValidHexColorCode(color.colorHexCode)) {
    return normalizeHexColorCode(color.colorHexCode)
  }

  return NEUTRAL_COLOR_SWATCH
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
        <Paintbrush className="size-5" />
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

export function ColorTableSection({
  colors,
  meta,
  page,
  limit,
  loadingColors,
  draftFilters,
  activeFilters,
  onDraftFiltersChange,
  onActiveFiltersChange,
  onPageChange,
  onLimitChange,
  onCreateColor,
  onEditColor,
  onDeleteColor,
  onResetFilters,
  canCreateColor,
  canUpdateColor,
  canDeleteColor,
}: ColorTableSectionProps) {
  const filterCount = useMemo(
    () =>
      [
        draftFilters.colorName,
        draftFilters.colorDisplayName,
        draftFilters.colorDescription,
      ].filter((value) => value.trim()).length,
    [draftFilters],
  )

  const filtersActive = Boolean(
    activeFilters.colorName ||
      activeFilters.colorDisplayName ||
      activeFilters.colorDescription,
  )

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) {
      return "No colors found"
    }

    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<ColorRecord>[]>(
    () => [
      {
        id: "color",
        header: "Color",
        cell: ({ row }) => {
          const color = row.original
          const swatch = getColorSwatchColor(color)

          return (
            <div className="pl-4">
              <div className="flex items-center gap-3">
                <span
                  className="size-8 shrink-0 rounded-full ring-1 ring-slate-900/10 dark:ring-white/10"
                  style={{ backgroundColor: swatch }}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">
                    {color.colorName}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    ID #{color.id}
                  </p>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        id: "displayName",
        header: "Display name",
        cell: ({ row }) => (
          <span className="text-xs text-slate-700 dark:text-slate-200">
            {row.original.colorDisplayName?.trim() || "Not set"}
          </span>
        ),
      },
      {
        id: "hexCode",
        header: "Hex code",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {row.original.colorHexCode?.trim() || "Not set"}
          </span>
        ),
      },
      {
        id: "description",
        header: "Description",
        cell: ({ row }) => (
          <p className="line-clamp-2 max-w-[22rem] whitespace-normal text-xs leading-5 text-slate-600 dark:text-slate-300">
            {row.original.colorDescription || "No description provided."}
          </p>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const color = row.original
          const statusTone = colorBadgeTone(color)
          const statusLabel = color.deleted_at
            ? "Deleted"
            : color.isActive === false
              ? "Inactive"
              : "Active"

          return (
            <Badge variant={statusTone} className="rounded-full px-3 py-1">
              {statusLabel}
            </Badge>
          )
        },
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => {
          const color = row.original

          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">
                {formatDate(color.created_at)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {color.created_by_user?.name?.trim() || color.created_by_id?.trim()
                  ? `Created by ${color.created_by_user?.name?.trim() || color.created_by_id?.trim()}`
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
          const color = row.original

          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">
                {formatDate(color.updated_at)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {color.updated_by_user?.name?.trim() || color.updated_by_id?.trim()
                  ? `Updated by ${color.updated_by_user?.name?.trim() || color.updated_by_id?.trim()}`
                  : "No editor metadata"}
              </p>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const color = row.original
          const hasActions = canUpdateColor || canDeleteColor

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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                  >
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {canUpdateColor ? (
                    <DropdownMenuItem onSelect={() => onEditColor(color.id)}>
                      Edit color
                    </DropdownMenuItem>
                  ) : null}
                  {canUpdateColor && canDeleteColor ? <DropdownMenuSeparator /> : null}
                  {canDeleteColor ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => onDeleteColor(color)}
                    >
                      Delete color
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [canDeleteColor, canUpdateColor, onDeleteColor, onEditColor],
  )

  const table = useReactTable({
    data: colors,
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
                Search by color name, display name, or description.
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
              <label htmlFor="filterColorName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Color name
              </label>
              <Input
                id="filterColorName"
                value={draftFilters.colorName}
                className="h-9 rounded-md px-2 text-xs"
                onChange={(event) =>
                  onDraftFiltersChange({
                    ...draftFilters,
                    colorName: event.target.value,
                  })
                }
                placeholder="Input color name"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <label htmlFor="filterColorDisplayName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Display name
              </label>
              <Input
                id="filterColorDisplayName"
                value={draftFilters.colorDisplayName}
                className="h-9 rounded-md px-2 text-xs"
                onChange={(event) =>
                  onDraftFiltersChange({
                    ...draftFilters,
                    colorDisplayName: event.target.value,
                  })
                }
                placeholder="Input color display name"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <label htmlFor="filterColorDescription" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Description
              </label>
              <Input
                id="filterColorDescription"
                value={draftFilters.colorDescription}
                className="h-9 rounded-md px-2 text-xs"
                onChange={(event) =>
                  onDraftFiltersChange({
                    ...draftFilters,
                    colorDescription: event.target.value,
                  })
                }
                placeholder="Input description"
              />
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
              <CardTitle className="text-lg">Colors table</CardTitle>
              <CardDescription>{pageSummary}</CardDescription>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="lg:hidden">
            {loadingColors ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 rounded-2xl" />
                ))}
              </div>
            ) : colors.length > 0 ? (
              <div className="space-y-3 p-4">
                {colors.map((color) => {
                  const statusTone = colorBadgeTone(color)
                  const statusLabel = color.deleted_at
                    ? "Deleted"
                    : color.isActive === false
                      ? "Inactive"
                      : "Active"

                  return (
                    <article
                      key={color.id}
                      className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <span
                              className="size-9 shrink-0 rounded-full ring-1 ring-slate-900/10 dark:ring-white/10"
                              style={{ backgroundColor: getColorSwatchColor(color) }}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                                {getColorLabel(color)}
                              </p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {color.colorName}
                              </p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {color.colorHexCode?.trim() || "Not set"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {canUpdateColor || canDeleteColor ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full"
                              >
                                <MoreHorizontal className="size-3.5" />
                                <span className="sr-only">Open actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {canUpdateColor ? (
                                <DropdownMenuItem onSelect={() => onEditColor(color.id)}>
                                  Edit color
                                </DropdownMenuItem>
                              ) : null}
                              {canUpdateColor && canDeleteColor ? <DropdownMenuSeparator /> : null}
                              {canDeleteColor ? (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => onDeleteColor(color)}
                                >
                                  Delete color
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant={statusTone} className="rounded-full px-3 py-1">
                          {statusLabel}
                        </Badge>
                        {color.deleted_at ? (
                          <Badge variant="outline" className="rounded-full px-3 py-1">
                            Deleted record
                          </Badge>
                        ) : null}
                      </div>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {color.colorDescription || "No description provided."}
                      </p>

                      <div className="mt-4 flex items-start justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <div className="space-y-1">
                          <span className="block">Created: {formatDate(color.created_at)}</span>
                          <span className="block">Updated: {formatDate(color.updated_at)}</span>
                        </div>
                        <span>#{color.id}</span>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="p-4">
                <EmptyState
                  title="No colors found"
                  description={
                    filtersActive
                      ? "Try clearing or relaxing the current filters."
                      : "Create the first merchandising color to get started."
                  }
                  actionLabel={filtersActive || !canCreateColor ? "Reset filters" : "New color"}
                  onAction={filtersActive || !canCreateColor ? onResetFilters : onCreateColor}
                />
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pageSummary}
              </p>
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl"
                  onClick={() => onPageChange(1)}
                  disabled={loadingColors || page <= 1}
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
                  disabled={loadingColors || page <= 1}
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
                  disabled={loadingColors || page >= (meta?.totalPages ?? 1)}
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
                  disabled={loadingColors || page >= (meta?.totalPages ?? 1)}
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
              isLoading={loadingColors}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={(nextPage) => onPageChange(nextPage)}
              onPageSizeChange={(nextPageSize) => {
                onLimitChange(nextPageSize)
                onPageChange(1)
              }}
              emptyState={
                <EmptyState
                  title="No colors found"
                  description={
                    filtersActive
                      ? "Try clearing or relaxing the current filters."
                      : "Create the first merchandising color to get started."
                  }
                  actionLabel={filtersActive || !canCreateColor ? "Reset filters" : "New color"}
                  onAction={filtersActive || !canCreateColor ? onResetFilters : onCreateColor}
                />
              }
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
