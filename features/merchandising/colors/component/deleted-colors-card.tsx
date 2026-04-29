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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import type { ColorFilterValues, ColorRecord, PaginationMeta } from "../color.types"

type DeletedColorActionMode = "restore" | "permanent"

type DeletedColorsCardProps = {
  deletedColors: ColorRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeletedColors: boolean
  deletedError: string
  deletedDraftFilters: ColorFilterValues
  deletedActiveFilters: ColorFilterValues
  onDeletedDraftFiltersChange: (nextValues: ColorFilterValues) => void
  onDeletedActiveFiltersChange: (nextValues: ColorFilterValues) => void
  onDeletedPageChange: (nextPage: number) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (color: ColorRecord, mode: DeletedColorActionMode) => void
  onRetry: () => void
  canRestoreColor: boolean
  canPermanentlyDeleteColor: boolean
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

function getUserLabel(user?: { name?: string | null } | null, fallback?: string | null) {
  return user?.name?.trim() || fallback?.trim() || ""
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

export function DeletedColorsCard({
  deletedColors,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeletedColors,
  deletedError,
  deletedDraftFilters,
  deletedActiveFilters,
  onDeletedDraftFiltersChange,
  onDeletedActiveFiltersChange,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  onRetry,
  canRestoreColor,
  canPermanentlyDeleteColor,
}: DeletedColorsCardProps) {
  const deletedTotal = deletedMeta?.total ?? deletedColors.length

  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) {
      return "No deleted colors found"
    }

    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedFilterCount = useMemo(
    () =>
      [
        deletedDraftFilters.colorName,
        deletedDraftFilters.colorDisplayName,
        deletedDraftFilters.colorDescription,
      ].filter((value) => value.trim()).length,
    [deletedDraftFilters],
  )

  const deletedFiltersActive =
    deletedActiveFilters.colorName ||
    deletedActiveFilters.colorDisplayName ||
    deletedActiveFilters.colorDescription

  const deletedColumns = useMemo<ColumnDef<ColorRecord>[]>(
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
        id: "deleted",
        header: "Deleted",
        cell: ({ row }) => {
          const color = row.original

          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">
                {formatDate(color.deleted_at)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserLabel(color.deleted_by_user, color.deleted_by_id)
                  ? `Deleted by ${getUserLabel(color.deleted_by_user, color.deleted_by_id)}`
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
          const color = row.original
          const hasActions = canRestoreColor || canPermanentlyDeleteColor

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
                    <span className="sr-only">Open deleted item actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canRestoreColor ? (
                    <DropdownMenuItem onSelect={() => onOpenAction(color, "restore")}>
                      Restore color
                    </DropdownMenuItem>
                  ) : null}
                  {canRestoreColor && canPermanentlyDeleteColor ? <DropdownMenuSeparator /> : null}
                  {canPermanentlyDeleteColor ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => onOpenAction(color, "permanent")}
                    >
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
    [canPermanentlyDeleteColor, canRestoreColor, onOpenAction],
  )

  const deletedTable = useReactTable({
    data: deletedColors,
    columns: deletedColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Deleted colors</CardTitle>
            <CardDescription>
              Restore older soft deleted colors or remove them permanently.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
            {deletedTotal} deleted
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {deletedError ? (
          <div className="p-4 sm:p-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <p className="font-semibold">Unable to load deleted colors</p>
              <p className="mt-1 leading-6">{deletedError}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 rounded-xl"
                onClick={onRetry}
              >
                <RefreshCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-slate-200/70 px-4 pb-4 dark:border-white/10 sm:px-6">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Deleted filters
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Search by color name, display name, or description.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">
                  {deletedFilterCount} active filter{deletedFilterCount === 1 ? "" : "s"}
                </Badge>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  onDeletedActiveFiltersChange(deletedDraftFilters)
                  onDeletedPageChange(1)
                }}
                className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                <div className="min-w-0 space-y-1">
                  <label htmlFor="deletedFilterColorName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Color name
                  </label>
                  <Input
                    id="deletedFilterColorName"
                    value={deletedDraftFilters.colorName}
                    className="h-9 rounded-md px-2 text-xs"
                    onChange={(event) =>
                      onDeletedDraftFiltersChange({
                        ...deletedDraftFilters,
                        colorName: event.target.value,
                      })
                    }
                    placeholder="Input color name"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <label htmlFor="deletedFilterColorDisplayName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Display name
                  </label>
                  <Input
                    id="deletedFilterColorDisplayName"
                    value={deletedDraftFilters.colorDisplayName}
                    className="h-9 rounded-md px-2 text-xs"
                    onChange={(event) =>
                      onDeletedDraftFiltersChange({
                        ...deletedDraftFilters,
                        colorDisplayName: event.target.value,
                      })
                    }
                    placeholder="Input color display name"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <label htmlFor="deletedFilterColorDescription" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Description
                  </label>
                  <Input
                    id="deletedFilterColorDescription"
                    value={deletedDraftFilters.colorDescription}
                    className="h-9 rounded-md px-2 text-xs"
                    onChange={(event) =>
                      onDeletedDraftFiltersChange({
                        ...deletedDraftFilters,
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
                    onClick={() => {
                      onDeletedDraftFiltersChange({
                        colorName: "",
                        colorDisplayName: "",
                        colorDescription: "",
                      })
                      onDeletedActiveFiltersChange({
                        colorName: "",
                        colorDisplayName: "",
                        colorDescription: "",
                      })
                      onDeletedPageChange(1)
                    }}
                    disabled={!deletedFiltersActive && deletedFilterCount === 0}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </div>
            <div className="lg:hidden">
              {loadingDeletedColors ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-2xl" />
                  ))}
                </div>
              ) : deletedColors.length > 0 ? (
                <div className="space-y-3 p-4">
                  {deletedColors.map((color) => (
                    <article
                      key={color.id}
                      className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <span
                              className="size-9 shrink-0 rounded-full ring-1 ring-slate-900/10 dark:ring-white/10"
                              style={{ backgroundColor: getColorSwatchColor(color) }}
                            />
                            <div className="min-w-0 space-y-0.5">
                              <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Color name
                              </p>
                              <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                                {color.colorName}
                              </p>
                              <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Display name
                              </p>
                              <p className="truncate text-xs text-slate-700 dark:text-slate-200">
                                {color.colorDisplayName?.trim() || "Not set"}
                              </p>
                              <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Hex code
                              </p>
                              <p className="truncate text-xs text-slate-700 dark:text-slate-200">
                                {color.colorHexCode?.trim() || "Not set"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {canRestoreColor || canPermanentlyDeleteColor ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full"
                              >
                                <MoreHorizontal className="size-3.5" />
                                <span className="sr-only">Open deleted color actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {canRestoreColor ? (
                                <DropdownMenuItem
                                  onSelect={() => onOpenAction(color, "restore")}
                                >
                                  Restore color
                                </DropdownMenuItem>
                              ) : null}
                              {canRestoreColor && canPermanentlyDeleteColor ? (
                                <DropdownMenuSeparator />
                              ) : null}
                              {canPermanentlyDeleteColor ? (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => onOpenAction(color, "permanent")}
                                >
                                  Delete permanently
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>

                      <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                        Deleted: {formatDate(color.deleted_at)}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Deleted by{" "}
                        {getUserLabel(color.deleted_by_user, color.deleted_by_id) || "Unknown"}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-4">
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      No deleted colors found
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Soft deleted colors will appear here when users remove them.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {deletedPageSummary}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-xl"
                    onClick={() => onDeletedPageChange(1)}
                    disabled={loadingDeletedColors || deletedPage <= 1}
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
                    disabled={loadingDeletedColors || deletedPage <= 1}
                  >
                    <ChevronLeft className="size-3.5" />
                    <span className="sr-only">Previous deleted page</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-xl"
                    onClick={() =>
                      onDeletedPageChange(
                        Math.min(deletedMeta?.totalPages ?? 1, deletedPage + 1),
                      )
                    }
                    disabled={loadingDeletedColors || deletedPage >= (deletedMeta?.totalPages ?? 1)}
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
                    disabled={loadingDeletedColors || deletedPage >= (deletedMeta?.totalPages ?? 1)}
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
                isLoading={loadingDeletedColors}
                pageSizeOptions={[5, 10, 25]}
                onPageChange={onDeletedPageChange}
                onPageSizeChange={(nextPageSize) => {
                  onDeletedLimitChange(nextPageSize)
                  onDeletedPageChange(1)
                }}
                emptyState={
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      No deleted colors found
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Soft deleted colors will appear here when users remove them.
                    </p>
                  </div>
                }
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
