/* eslint-disable react-hooks/incompatible-library */
"use client"

import { useMemo, useState } from "react"

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  MoreHorizontal,
  Search,
  Upload,
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

import type { BuyerSummary, PaginationMeta, StyleFilterValues, StyleRecord } from "../style.types"

const ALL_STATUS_VALUE = "__all_statuses__"

type BuyerFilterOption = BuyerSummary & AppComboboxOption

type StyleTableSectionProps = {
  styles: StyleRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loadingStyles: boolean
  draftFilters: StyleFilterValues
  activeFilters: StyleFilterValues
  buyerOptions: BuyerSummary[]
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<BuyerFilterOption>>
  onDraftFiltersChange: (nextValues: StyleFilterValues) => void
  onActiveFiltersChange: (nextValues: StyleFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreateStyle: () => void
  onEditStyle: (styleId: string) => void
  onDeleteStyle: (style: StyleRecord) => void
  onResetFilters: () => void
  onDownloadTemplate: () => void
  onUploadTemplate: () => void
  canCreateStyle: boolean
  canUpdateStyle: boolean
  canDeleteStyle: boolean
  downloadingTemplate: boolean
  uploadingTemplate: boolean
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

function styleStatusTone(style?: StyleRecord | null) {
  if (!style) return "outline" as const
  if (style.deleted_at) return "destructive" as const
  return style.isActive === false ? "outline" : "secondary"
}

function getStyleImageUrl(style: StyleRecord) {
  return (
    style.image?.thumbnail_url?.trim() ||
    style.image?.public_url?.trim() ||
    style.image?.file_url?.trim() ||
    style.image?.file_path?.trim() ||
    ""
  )
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
        <UserRound className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">
        {actionLabel}
      </Button>
    </div>
  )
}

export function ActiveStylesSection({
  styles,
  meta,
  page,
  limit,
  loadingStyles,
  draftFilters,
  activeFilters,
  buyerOptions,
  loadBuyerOptions,
  onDraftFiltersChange,
  onActiveFiltersChange,
  onPageChange,
  onLimitChange,
  onCreateStyle,
  onEditStyle,
  onDeleteStyle,
  onResetFilters,
  onDownloadTemplate,
  onUploadTemplate,
  canCreateStyle,
  canUpdateStyle,
  canDeleteStyle,
  downloadingTemplate,
  uploadingTemplate,
}: StyleTableSectionProps) {
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
    () => selectableBuyers.find((buyer) => buyer.value === draftFilters.buyerId) ?? null,
    [draftFilters.buyerId, selectableBuyers],
  )
  const filterBuyerValue =
    draftFilters.buyerId && selectedFilterBuyer?.value === draftFilters.buyerId
      ? selectedFilterBuyer
      : derivedFilterBuyer

  const filterCount = useMemo(
    () =>
      [
        draftFilters.buyerId,
        draftFilters.styleNo,
        draftFilters.itemType,
        draftFilters.currencyId,
        draftFilters.isActive,
        draftFilters.productType,
      ].filter((value) => value.trim()).length,
    [draftFilters],
  )

  const filtersActive = Boolean(
    activeFilters.buyerId ||
    activeFilters.styleNo ||
    activeFilters.itemType ||
    activeFilters.currencyId ||
    activeFilters.isActive ||
    activeFilters.productType
  )

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No styles found"
    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<StyleRecord>[]>(
    () => [
      {
        id: "style",
        header: "Style",
        cell: ({ row }) => {
          const s = row.original
          const imageUrl = getStyleImageUrl(s)
          return (
            <div className="pl-4">
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={s.styleNo || "Style image"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                      {(s.styleNo?.trim() || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{s.styleNo}</p>
                  <p className="truncate text-[11px] text-slate-500">{s.styleName ?? "-"}</p>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        id: "buyer",
        header: "Buyer",
        cell: ({ row }) => {
          const s = row.original
          return (
            <span className="text-xs font-medium">
              {getBuyerLabel(s.buyer, s.buyerId)}
            </span>
          )
        },
      },
      {
        id: "itemType",
        header: "Item Type",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.itemType ?? "-"}</span>
        ),
      },
      {
        id: "department",
        header: "Department",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.productDepartment ?? "-"}</span>
        ),
      },
      {
        id: "uom",
        header: "UOM",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.itemUom ?? "-"}</span>
        ),
      },
      {
        id: "cm",
        header: "CM Sewing",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.cmSewing ?? "-"}
          </span>
        ),
      },
      {
        id: "currency",
        header: "Currency",
        cell: ({ row }) => {
          const c = row.original.currency
          return (
            <span className="text-xs">
              {c ? c.currencyName : row.original.currencyId}
            </span>
          )
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.original
          const label = s.deleted_at
            ? "Deleted"
            : s.isActive === false
              ? "Inactive"
              : "Active"

          const tone = styleStatusTone(s)

          return (
            <Badge variant={tone} className="rounded-full px-3 py-1">
              {label}
            </Badge>
          )
        },
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => {
          const s = row.original
          return (
            <div className="space-y-1">
              <p className="text-xs">{formatDate(s.created_at)}</p>
              <p className="text-[11px] text-slate-500">
                {getUserLabel(s.created_by_user, s.created_by_id)
                  ? `Created by ${getUserLabel(s.created_by_user, s.created_by_id)}`
                  : "-"}
              </p>
            </div>
          )
        },
      },
      {
        id: "updated",
        header: "Updated",
        cell: ({ row }) => {
          const s = row.original
          const hasUpdate = Boolean(s.updated_by_id || s.updated_by_user)

          return (
            <div className="space-y-1">
              {hasUpdate ? (
                <>
                  <p className="text-xs">{formatDate(s.updated_at)}</p>
                  <p className="text-[11px] text-slate-500">
                    {getUserLabel(s.updated_by_user, s.updated_by_id)
                      ? `Updated by ${getUserLabel(s.updated_by_user, s.updated_by_id)}`
                      : "-"}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400">Not edited</p>
              )}
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const s = row.original
          const hasActions = canUpdateStyle || canDeleteStyle

          if (!hasActions) {
            return (
              <div className="pr-4 text-right text-xs text-slate-400">
                No actions
              </div>
            )
          }

          return (
            <div className="pr-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm">
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-44">
                  {canUpdateStyle && (
                    <DropdownMenuItem onSelect={() => onEditStyle(s.id)}>
                      Edit
                    </DropdownMenuItem>
                  )}

                  {canUpdateStyle && canDeleteStyle && (
                    <DropdownMenuSeparator />
                  )}

                  {canDeleteStyle && (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => onDeleteStyle(s)}
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [canDeleteStyle, canUpdateStyle, onDeleteStyle, onEditStyle]
  )

  const table = useReactTable({
    data: styles,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Styles table</CardTitle>
            <CardDescription>{pageSummary}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}
            </Badge>
            <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">
              {filterCount} active filter{filterCount === 1 ? "" : "s"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="rounded-full" disabled={!canCreateStyle}>
                  <MoreHorizontal className="size-2.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={onDownloadTemplate} disabled={downloadingTemplate}>
                  <Download className="mr-2 size-3.5" />
                  {downloadingTemplate ? "Downloading template..." : "Download template"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onUploadTemplate} disabled={uploadingTemplate}>
                  <Upload className="mr-2 size-3.5" />
                  {uploadingTemplate ? "Uploading styles..." : "Upload styles"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-0 sm:px-2">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onActiveFiltersChange(draftFilters)
            onPageChange(1)
          }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
        >
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterStyleBuyer" className="text-xs font-medium text-slate-700 dark:text-slate-300">Buyer</label>
            <AppCombobox
              value={filterBuyerValue}
              onValueChange={(buyer) => {
                setSelectedFilterBuyer(buyer)
                onDraftFiltersChange({ ...draftFilters, buyerId: buyer?.value ?? "" })
              }}
              loadItems={loadBuyerOptions}
              initialLimit={10}
              searchLimit={10}
              inputProps={{ id: "filterStyleBuyer" }}
              placeholder="All buyers"
              loadingMessage="Loading buyers..."
              emptyMessage="No buyers match your search."
              showClear={Boolean(draftFilters.buyerId)}
              inputClassName="h-7 rounded-md px-2 text-xs"
              contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterStyleNo" className="text-xs font-medium text-slate-700 dark:text-slate-300">Style No</label>
            <Input
              id="filterStyleNo"
              value={draftFilters.styleNo}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) => onDraftFiltersChange({ ...draftFilters, styleNo: event.target.value })}
              placeholder="Input style no"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterStyleItemType" className="text-xs font-medium text-slate-700 dark:text-slate-300">Item Type</label>
            <Input
              id="filterStyleItemType"
              value={draftFilters.itemType}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) => onDraftFiltersChange({ ...draftFilters, itemType: event.target.value })}
              placeholder="Input item type"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterStyleStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
            <AppSelect
              triggerId="filterStyleStatus"
              value={draftFilters.isActive || ALL_STATUS_VALUE}
              onValueChange={(value) => onDraftFiltersChange({ ...draftFilters, isActive: value === ALL_STATUS_VALUE ? "" : value })}
              placeholder="All statuses"
              options={[
                { value: ALL_STATUS_VALUE, label: "All statuses" },
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-2 xl:justify-self-end">
            <Button type="submit" className="w-full rounded-xl sm:w-auto">
              <Search className="size-3.5" />
              Search
            </Button>
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={onResetFilters}>
              Reset
            </Button>
            {canCreateStyle ? (
              <Button type="button" onClick={onCreateStyle} className="w-full rounded-xl sm:w-auto">
                <UserRound className="size-3.5" />
                New style
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>

      <CardContent className="p-0 border-t border-slate-200/70 dark:border-white/10">
        <div className="lg:hidden">
          {loadingStyles ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : styles.length > 0 ? (
            <div className="space-y-3 p-4">
              {styles.map((style) => {
                const imageUrl = getStyleImageUrl(style)
                const tone = styleStatusTone(style)
                const label = style.deleted_at ? "Deleted" : style.isActive === false ? "Inactive" : "Active"

                return (
                  <article
                    key={style.id}
                    className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={style.styleNo || "Style image"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {(style.styleNo?.trim() || "?").charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{style.styleNo}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{style.styleName}</p>
                          </div>
                        </div>
                      </div>

                      {canUpdateStyle || canDeleteStyle ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                              <MoreHorizontal className="size-3.5" />
                              <span className="sr-only">Open actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {canUpdateStyle ? <DropdownMenuItem onSelect={() => onEditStyle(style.id)}>Edit style</DropdownMenuItem> : null}
                            {canUpdateStyle && canDeleteStyle ? <DropdownMenuSeparator /> : null}
                            {canDeleteStyle ? <DropdownMenuItem variant="destructive" onSelect={() => onDeleteStyle(style)}>Delete style</DropdownMenuItem> : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={tone} className="rounded-full px-3 py-1">{label}</Badge>
                      <Badge variant="outline" className="rounded-full px-3 py-1">{getBuyerLabel(style.buyer, style.buyerId)}</Badge>
                    </div>

                    <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <p>Created: {formatDate(style.created_at)}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                title="No styles found"
                description={
                  filtersActive
                    ? "Try clearing or relaxing the current filters."
                    : canCreateStyle
                      ? "Create the first style to get started."
                      : "No style records are available for the selected organization."
                }
                actionLabel={filtersActive || !canCreateStyle ? "Reset filters" : "New style"}
                onAction={filtersActive || !canCreateStyle ? onResetFilters : onCreateStyle}
              />
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">{pageSummary}</p>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(1)} disabled={loadingStyles || page <= 1}>
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.max(1, current - 1))} disabled={loadingStyles || page <= 1}>
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.min(meta?.totalPages ?? 1, current + 1))} disabled={loadingStyles || page >= (meta?.totalPages ?? 1)}>
                <ChevronRight className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(meta?.totalPages ?? 1)} disabled={loadingStyles || page >= (meta?.totalPages ?? 1)}>
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
            isLoading={loadingStyles}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={(nextPage) => onPageChange(nextPage)}
            onPageSizeChange={(nextPageSize) => onLimitChange(nextPageSize)}
            emptyState={
              <EmptyState
                title="No styles found"
                description={
                  filtersActive
                    ? "Try clearing or relaxing the current filters."
                    : canCreateStyle
                      ? "Create the first style to get started."
                      : "No style records are available for the selected organization."
                }
                actionLabel={filtersActive || !canCreateStyle ? "Reset filters" : "New style"}
                onAction={filtersActive || !canCreateStyle ? onResetFilters : onCreateStyle}
              />
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
