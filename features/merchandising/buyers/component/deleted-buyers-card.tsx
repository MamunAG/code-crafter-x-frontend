"use client"

import { useMemo } from "react"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { BuyerFilterValues, BuyerRecord, CountrySummary, PaginationMeta } from "../buyer.types"

const ALL_COUNTRY_VALUE = "__all_deleted_countries__"
const ALL_STATUS_VALUE = "__all_deleted_statuses__"

type DeletedBuyerActionMode = "restore" | "permanent"

type DeletedBuyersCardProps = {
  deletedBuyers: BuyerRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeletedBuyers: boolean
  deletedError: string
  deletedDraftFilters: BuyerFilterValues
  deletedActiveFilters: BuyerFilterValues
  countryOptions: CountrySummary[]
  onDeletedDraftFiltersChange: (nextValues: BuyerFilterValues) => void
  onDeletedActiveFiltersChange: (nextValues: BuyerFilterValues) => void
  onDeletedPageChange: (nextPage: number) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (buyer: BuyerRecord, mode: DeletedBuyerActionMode) => void
  canRestoreBuyer: boolean
  canPermanentlyDeleteBuyer: boolean
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function getCountryLabel(country?: CountrySummary | null, countryId?: number | null) {
  return country?.name?.trim() || (countryId ? `Country #${countryId}` : "No country")
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

export function DeletedBuyersCard({
  deletedBuyers,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeletedBuyers,
  deletedError,
  deletedDraftFilters,
  deletedActiveFilters,
  countryOptions,
  onDeletedDraftFiltersChange,
  onDeletedActiveFiltersChange,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  canRestoreBuyer,
  canPermanentlyDeleteBuyer,
}: DeletedBuyersCardProps) {
  const selectableCountries = useMemo(
    () => countryOptions.filter((country) => country.id != null),
    [countryOptions],
  )

  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) {
      return "No deleted buyers found"
    }

    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedFilterCount = useMemo(
    () =>
      [
        deletedDraftFilters.name,
        deletedDraftFilters.displayName,
        deletedDraftFilters.email,
        deletedDraftFilters.countryId,
        deletedDraftFilters.isActive,
      ].filter((value) => value.trim()).length,
    [deletedDraftFilters],
  )

  const deletedFiltersActive = Boolean(
    deletedActiveFilters.name ||
    deletedActiveFilters.displayName ||
    deletedActiveFilters.email ||
    deletedActiveFilters.countryId ||
    deletedActiveFilters.isActive,
  )

  const deletedColumns = useMemo<ColumnDef<BuyerRecord>[]>(
    () => [
      {
        id: "buyer",
        header: "Buyer",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{row.original.name}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{row.original.displayName}</p>
          </div>
        ),
      },
      {
        id: "email",
        header: "Email",
        cell: ({ row }) => <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.original.email}</span>,
      },
      {
        id: "country",
        header: "Country",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {getCountryLabel(row.original.country, row.original.countryId)}
          </span>
        ),
      },
      {
        id: "deleted",
        header: "Deleted",
        cell: ({ row }) => {
          const buyer = row.original
          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(buyer.deleted_at)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserLabel(buyer.deleted_by_user, buyer.deleted_by_id)
                  ? `Deleted by ${getUserLabel(buyer.deleted_by_user, buyer.deleted_by_id)}`
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
          const buyer = row.original
          const hasActions = canRestoreBuyer || canPermanentlyDeleteBuyer

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
                  {canRestoreBuyer ? <DropdownMenuItem onSelect={() => onOpenAction(buyer, "restore")}>Restore buyer</DropdownMenuItem> : null}
                  {canRestoreBuyer && canPermanentlyDeleteBuyer ? <DropdownMenuSeparator /> : null}
                  {canPermanentlyDeleteBuyer ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(buyer, "permanent")}>
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
    [canPermanentlyDeleteBuyer, canRestoreBuyer, onOpenAction],
  )

  const deletedTable = useReactTable({
    data: deletedBuyers,
    columns: deletedColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Deleted buyers</CardTitle>
            <CardDescription>Restore old soft deleted buyers or remove them permanently.</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
            {deletedMeta?.total ?? deletedBuyers.length} deleted
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-b border-slate-200/70 p-4 dark:border-white/10">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1">
              <label htmlFor="deletedBuyerName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Buyer name</label>
              <Input id="deletedBuyerName" value={deletedDraftFilters.name} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, name: event.target.value })} placeholder="Input buyer name" />
            </div>
            <div className="space-y-1">
              <label htmlFor="deletedBuyerDisplayName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Display name</label>
              <Input id="deletedBuyerDisplayName" value={deletedDraftFilters.displayName} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, displayName: event.target.value })} placeholder="Input display name" />
            </div>
            <div className="space-y-1">
              <label htmlFor="deletedBuyerEmail" className="text-xs font-medium text-slate-700 dark:text-slate-300">Email</label>
              <Input id="deletedBuyerEmail" value={deletedDraftFilters.email} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, email: event.target.value })} placeholder="Input email" />
            </div>
            <div className="space-y-1">
              <label htmlFor="deletedBuyerCountry" className="text-xs font-medium text-slate-700 dark:text-slate-300">Country</label>
              <Select
                value={deletedDraftFilters.countryId || ALL_COUNTRY_VALUE}
                onValueChange={(value) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, countryId: value === ALL_COUNTRY_VALUE ? "" : value })}
              >
                <SelectTrigger id="deletedBuyerCountry" className="h-7 w-full rounded-md px-2 text-xs">
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_COUNTRY_VALUE}>All countries</SelectItem>
                  {selectableCountries.map((country) => (
                    <SelectItem key={country.id ?? country.name ?? "country"} value={String(country.id)}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="deletedBuyerStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
              <Select
                value={deletedDraftFilters.isActive || ALL_STATUS_VALUE}
                onValueChange={(value) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, isActive: value === ALL_STATUS_VALUE ? "" : value })}
              >
                <SelectTrigger id="deletedBuyerStatus" className="h-7 w-full rounded-md px-2 text-xs">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUS_VALUE}>All statuses</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
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
                const cleared = { name: "", displayName: "", contact: "", email: "", countryId: "", address: "", isActive: "", remarks: "" }
                onDeletedDraftFiltersChange(cleared)
                onDeletedActiveFiltersChange(cleared)
                onDeletedPageChange(1)
              }}
            >
              Reset
            </Button>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
              {deletedFilterCount} active filter{deletedFilterCount === 1 ? "" : "s"}
            </Badge>
            <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
          </div>
        </div>

        {deletedError ? (
          <div className="p-4">
            <EmptyState title="Unable to load deleted buyers" description={deletedError} />
          </div>
        ) : null}

        {!deletedError ? (
          <>
            <div className="lg:hidden">
              {loadingDeletedBuyers ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-2xl" />
                  ))}
                </div>
              ) : deletedBuyers.length > 0 ? (
                <div className="space-y-3 p-4">
                  {deletedBuyers.map((buyer) => (
                    <article
                      key={buyer.id}
                      className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{buyer.name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{buyer.displayName}</p>
                        </div>

                        {canRestoreBuyer || canPermanentlyDeleteBuyer ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                                <MoreHorizontal className="size-3.5" />
                                <span className="sr-only">Open deleted item actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {canRestoreBuyer ? <DropdownMenuItem onSelect={() => onOpenAction(buyer, "restore")}>Restore buyer</DropdownMenuItem> : null}
                              {canRestoreBuyer && canPermanentlyDeleteBuyer ? <DropdownMenuSeparator /> : null}
                              {canPermanentlyDeleteBuyer ? (
                                <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(buyer, "permanent")}>
                                  Delete permanently
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="destructive" className="rounded-full px-3 py-1">Deleted</Badge>
                        <Badge variant="outline" className="rounded-full px-3 py-1">{getCountryLabel(buyer.country, buyer.countryId)}</Badge>
                      </div>

                      <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <p>Email: {buyer.email}</p>
                        <p>Deleted: {formatDate(buyer.deleted_at)}</p>
                        <p>
                          {getUserLabel(buyer.deleted_by_user, buyer.deleted_by_id)
                            ? `Deleted by ${getUserLabel(buyer.deleted_by_user, buyer.deleted_by_id)}`
                            : "Deleted item"}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState
                    title="No deleted buyers found"
                    description={
                      deletedFiltersActive
                        ? "Try clearing or relaxing the current filters."
                        : "Soft deleted buyers will appear here when users remove them."
                    }
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(1)} disabled={loadingDeletedBuyers || deletedPage <= 1}>
                    <ChevronsLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.max(1, deletedPage - 1))} disabled={loadingDeletedBuyers || deletedPage <= 1}>
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.min(deletedMeta?.totalPages ?? 1, deletedPage + 1))} disabled={loadingDeletedBuyers || deletedPage >= (deletedMeta?.totalPages ?? 1)}>
                    <ChevronRight className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(deletedMeta?.totalPages ?? 1)} disabled={loadingDeletedBuyers || deletedPage >= (deletedMeta?.totalPages ?? 1)}>
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
                isLoading={loadingDeletedBuyers}
                pageSizeOptions={[5, 10, 25, 50]}
                onPageChange={(nextPage) => onDeletedPageChange(nextPage)}
                onPageSizeChange={(nextPageSize) => {
                  onDeletedLimitChange(nextPageSize)
                  onDeletedPageChange(1)
                }}
                emptyState={
                  <EmptyState
                    title="No deleted buyers found"
                    description={
                      deletedFiltersActive
                        ? "Try clearing or relaxing the current filters."
                        : "Soft deleted buyers will appear here when users remove them."
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
