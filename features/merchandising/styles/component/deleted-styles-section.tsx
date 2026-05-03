/* eslint-disable react-hooks/incompatible-library */
"use client"

import { useMemo, useState } from "react"

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Search,
  UserRound,
} from "lucide-react"
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { AppDataTable } from "@/components/app-data-table"
import {
  AppCombobox,
  type AppComboboxLoadParams,
  type AppComboboxLoadResult,
  type AppComboboxOption,
} from "@/components/app-combobox"
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

import type { StyleFilterValues, StyleRecord, BuyerSummary, PaginationMeta } from "../style.types"

const ALL_STATUS_VALUE = "__all_deleted_statuses__"

type DeletedStyleActionMode = "restore" | "permanent"
type BuyerFilterOption = BuyerSummary & AppComboboxOption

type DeletedStylesCardProps = {
  deletedStyles: StyleRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeletedStyles: boolean
  deletedError: string
  deletedDraftFilters: StyleFilterValues
  deletedActiveFilters: StyleFilterValues
  buyerOptions: BuyerSummary[]
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<BuyerFilterOption>>
  onDeletedDraftFiltersChange: (nextValues: StyleFilterValues) => void
  onDeletedActiveFiltersChange: (nextValues: StyleFilterValues) => void
  onDeletedPageChange: (nextPage: number) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (style: StyleRecord, mode: DeletedStyleActionMode) => void
  canRestoreStyle: boolean
  canPermanentlyDeleteStyle: boolean
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function getBuyerLabel(buyer?: BuyerSummary | null, buyerId?: string | null) {
  return buyer?.name?.trim() || (buyerId ? `Buyer #${buyerId}` : "No buyer")
}

function getUserLabel(user?: { name?: string | null } | null, fallback?: string | null) {
  return user?.name?.trim() || fallback?.trim() || ""
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <UserRound className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  )
}

export function DeletedStylesSection({
  deletedStyles,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeletedStyles,
  deletedError,
  deletedDraftFilters,
  deletedActiveFilters,
  buyerOptions,
  loadBuyerOptions,
  onDeletedDraftFiltersChange,
  onDeletedActiveFiltersChange,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  canRestoreStyle,
  canPermanentlyDeleteStyle,
}: DeletedStylesCardProps) {
  const [selectedFilterBuyer, setSelectedFilterBuyer] = useState<BuyerFilterOption | null>(null)
  const selectableBuyers = useMemo(
    () =>
      buyerOptions
        .filter((buyer) => buyer.id != null)
        .map<BuyerFilterOption>((buyer) => ({
          ...buyer,
          label: buyer.name ?? "",
          value: String(buyer.id),
        })),
    [buyerOptions],
  )
  const derivedFilterBuyer = useMemo(
    () => selectableBuyers.find((buyer) => buyer.value === deletedDraftFilters.buyerId) ?? null,
    [deletedDraftFilters.buyerId, selectableBuyers],
  )
  const filterBuyerValue =
    deletedDraftFilters.buyerId && selectedFilterBuyer?.value === deletedDraftFilters.buyerId
      ? selectedFilterBuyer
      : derivedFilterBuyer

  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) {
      return "No deleted styles found"
    }

    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedFilterCount = useMemo(
    () =>
      [
        deletedDraftFilters.buyerId,
        deletedDraftFilters.styleNo,
        deletedDraftFilters.itemType,
        deletedDraftFilters.currencyId,
        deletedDraftFilters.productType,
        deletedDraftFilters.isActive,
      ].filter((value) => value.trim()).length,
    [deletedDraftFilters],
  )

  const deletedFiltersActive = Boolean(
    deletedActiveFilters.buyerId ||
    deletedActiveFilters.styleNo ||
    deletedActiveFilters.itemType ||
    deletedActiveFilters.currencyId ||
    deletedActiveFilters.productType ||
    deletedActiveFilters.isActive,
  )

  const deletedColumns = useMemo<ColumnDef<StyleRecord>[]>(
    () => [
      {
        id: "style",
        header: "Style",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{row.original.styleNo}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{row.original.styleName}</p>
          </div>
        ),
      },
      {
        id: "buyer",
        header: "Buyer",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {getBuyerLabel(row.original.buyer, row.original.buyerId)}
          </span>
        ),
      },
      {
        id: "deleted",
        header: "Deleted",
        cell: ({ row }) => {
          const style = row.original
          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(style.deleted_at)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserLabel(style.deleted_by_user, style.deleted_by_id)
                  ? `Deleted by ${getUserLabel(style.deleted_by_user, style.deleted_by_id)}`
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
          const style = row.original
          const hasActions = canRestoreStyle || canPermanentlyDeleteStyle

          if (!hasActions) {
            return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>
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
                <DropdownMenuContent align="end" className="w-48">
                  {canRestoreStyle ? <DropdownMenuItem onSelect={() => onOpenAction(style, "restore")}>Restore style</DropdownMenuItem> : null}
                  {canRestoreStyle && canPermanentlyDeleteStyle ? <DropdownMenuSeparator /> : null}
                  {canPermanentlyDeleteStyle ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(style, "permanent")}>
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
    [canPermanentlyDeleteStyle, canRestoreStyle, onOpenAction],
  )

  const deletedTable = useReactTable({
    data: deletedStyles,
    columns: deletedColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Deleted styles</CardTitle>
            <CardDescription>{deletedPageSummary}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              {deletedMeta?.total ?? deletedStyles.length} deleted
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
            onDeletedActiveFiltersChange(deletedDraftFilters)
            onDeletedPageChange(1)
          }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
        >
          {/* <div className="min-w-0 space-y-1">
            <label htmlFor="deletedStyleName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Style name</label>
            <Input id="deletedStyleName" value={deletedDraftFilters.name} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, name: event.target.value })} placeholder="Input style name" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedStyleDisplayName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Display name</label>
            <Input id="deletedStyleDisplayName" value={deletedDraftFilters.displayName} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, displayName: event.target.value })} placeholder="Input display name" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedStyleEmail" className="text-xs font-medium text-slate-700 dark:text-slate-300">Email</label>
            <Input id="deletedStyleEmail" value={deletedDraftFilters.email} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, email: event.target.value })} placeholder="Input email" />
          </div> */}
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedStyleBuyer" className="text-xs font-medium text-slate-700 dark:text-slate-300">Buyer</label>
            <AppCombobox
              value={filterBuyerValue}
              onValueChange={(buyer) => {
                setSelectedFilterBuyer(buyer)
                onDeletedDraftFiltersChange({ ...deletedDraftFilters, buyerId: buyer?.value ?? "" })
              }}
              loadItems={loadBuyerOptions}
              initialLimit={10}
              searchLimit={10}
              inputProps={{ id: "deletedStyleBuyer" }}
              placeholder="All buyers"
              loadingMessage="Loading buyers..."
              emptyMessage="No buyers match your search."
              showClear={Boolean(deletedDraftFilters.buyerId)}
              inputClassName="h-7 rounded-md px-2 text-xs"
              contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedStyleNo" className="text-xs font-medium text-slate-700 dark:text-slate-300">Style No</label>
            <Input
              id="deletedStyleNo"
              value={deletedDraftFilters.styleNo}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, styleNo: event.target.value })}
              placeholder="Input style no"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedStyleItemType" className="text-xs font-medium text-slate-700 dark:text-slate-300">Item Type</label>
            <Input
              id="deletedStyleItemType"
              value={deletedDraftFilters.itemType}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, itemType: event.target.value })}
              placeholder="Input item type"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedStyleStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
            <AppSelect
              triggerId="deletedStyleStatus"
              value={deletedDraftFilters.isActive || ALL_STATUS_VALUE}
              onValueChange={(value) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, isActive: value === ALL_STATUS_VALUE ? "" : value })}
              placeholder="All statuses"
              options={[
                { value: ALL_STATUS_VALUE, label: "All statuses" },
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-6">
            <Button type="submit" className="w-full rounded-xl sm:w-auto">
              <Search className="size-3.5" />
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl sm:w-auto"
              onClick={() => {
                const cleared = {
                  productType: "",
                  buyerId: "",
                  styleNo: "",
                  styleName: "",
                  itemType: "",
                  currencyId: "",
                  isActive: "",
                }
                setSelectedFilterBuyer(null)
                onDeletedDraftFiltersChange(cleared)
                onDeletedActiveFiltersChange(cleared)
                onDeletedPageChange(1)
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </CardContent>

      <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
        {deletedError ? (
          <div className="p-4">
            <EmptyState title="Unable to load deleted styles" description={deletedError} />
          </div>
        ) : null}

        {!deletedError ? (
          <>
            <div className="lg:hidden">
              {loadingDeletedStyles ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-2xl" />
                  ))}
                </div>
              ) : deletedStyles.length > 0 ? (
                <div className="space-y-3 p-4">
                  {deletedStyles.map((style) => (
                    <article
                      key={style.id}
                      className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{style.styleNo}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{style.styleName}</p>
                        </div>

                        {canRestoreStyle || canPermanentlyDeleteStyle ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                                <MoreHorizontal className="size-3.5" />
                                <span className="sr-only">Open deleted item actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {canRestoreStyle ? <DropdownMenuItem onSelect={() => onOpenAction(style, "restore")}>Restore style</DropdownMenuItem> : null}
                              {canRestoreStyle && canPermanentlyDeleteStyle ? <DropdownMenuSeparator /> : null}
                              {canPermanentlyDeleteStyle ? (
                                <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(style, "permanent")}>
                                  Delete permanently
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="destructive" className="rounded-full px-3 py-1">Deleted</Badge>
                        <Badge variant="outline" className="rounded-full px-3 py-1">{getBuyerLabel(style.buyer, style.buyerId)}</Badge>
                      </div>

                      <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <p>Deleted: {formatDate(style.deleted_at)}</p>
                        <p>
                          {getUserLabel(style.deleted_by_user, style.deleted_by_id)
                            ? `Deleted by ${getUserLabel(style.deleted_by_user, style.deleted_by_id)}`
                            : "Deleted item"}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState
                    title="No deleted styles found"
                    description={
                      deletedFiltersActive
                        ? "Try clearing or relaxing the current filters."
                        : "Soft deleted styles will appear here when users remove them."
                    }
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(1)} disabled={loadingDeletedStyles || deletedPage <= 1}>
                    <ChevronsLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.max(1, deletedPage - 1))} disabled={loadingDeletedStyles || deletedPage <= 1}>
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.min(deletedMeta?.totalPages ?? 1, deletedPage + 1))} disabled={loadingDeletedStyles || deletedPage >= (deletedMeta?.totalPages ?? 1)}>
                    <ChevronRight className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(deletedMeta?.totalPages ?? 1)} disabled={loadingDeletedStyles || deletedPage >= (deletedMeta?.totalPages ?? 1)}>
                    <ChevronsRight className="size-3.5" />
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
                isLoading={loadingDeletedStyles}
                pageSizeOptions={[5, 10, 25, 50]}
                onPageChange={(nextPage) => onDeletedPageChange(nextPage)}
                onPageSizeChange={(nextPageSize) => {
                  onDeletedLimitChange(nextPageSize)
                  onDeletedPageChange(1)
                }}
                emptyState={
                  <EmptyState
                    title="No deleted styles found"
                    description={
                      deletedFiltersActive
                        ? "Try clearing or relaxing the current filters."
                        : "Soft deleted styles will appear here when users remove them."
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
