"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, Search } from "lucide-react"
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table"

import { AppDataTable } from "@/components/app-data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import type { CurrencyFilterValues, CurrencyRecord, PaginationMeta } from "../currency.types"

type DeletedCurrencyActionMode = "restore" | "permanent"

type Props = {
  deletedCurrencies: CurrencyRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeletedCurrencies: boolean
  deletedError: string
  deletedDraftFilters: CurrencyFilterValues
  deletedActiveFilters: CurrencyFilterValues
  onDeletedDraftFiltersChange: (nextValues: CurrencyFilterValues) => void
  onDeletedActiveFiltersChange: (nextValues: CurrencyFilterValues) => void
  onDeletedPageChange: (nextPage: number) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (currency: CurrencyRecord, mode: DeletedCurrencyActionMode) => void
  canRestoreCurrency: boolean
  canPermanentlyDeleteCurrency: boolean
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function getUserLabel(user?: { name?: string | null } | null, fallback?: string | null) {
  return user?.name?.trim() || fallback?.trim() || ""
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  )
}

export function DeletedCurrenciesCard({
  deletedCurrencies,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeletedCurrencies,
  deletedError,
  deletedDraftFilters,
  deletedActiveFilters,
  onDeletedDraftFiltersChange,
  onDeletedActiveFiltersChange,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  canRestoreCurrency,
  canPermanentlyDeleteCurrency,
}: Props) {
  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) return "No deleted currencies found"
    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedFilterCount = useMemo(() => [deletedDraftFilters.currencyName, deletedDraftFilters.currencyCode, deletedDraftFilters.symbol].filter((value) => value.trim()).length, [deletedDraftFilters])
  const deletedFiltersActive = Boolean(deletedActiveFilters.currencyName || deletedActiveFilters.currencyCode || deletedActiveFilters.symbol)

  const deletedColumns = useMemo<ColumnDef<CurrencyRecord>[]>(
    () => [
      {
        id: "currency",
        header: "Currency",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{row.original.currencyName}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {row.original.currencyCode} - {row.original.symbol}
            </p>
          </div>
        ),
      },
      {
        id: "deleted",
        header: "Deleted",
        cell: ({ row }) => {
          const currency = row.original
          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(currency.deleted_at)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserLabel(currency.deleted_by_user, currency.deleted_by_id) ? `Deleted by ${getUserLabel(currency.deleted_by_user, currency.deleted_by_id)}` : "Deleted item"}
              </p>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const currency = row.original
          if (!canRestoreCurrency && !canPermanentlyDeleteCurrency) {
            return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>
          }
          return (
            <div className="pr-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canRestoreCurrency ? <DropdownMenuItem onSelect={() => onOpenAction(currency, "restore")}>Restore currency</DropdownMenuItem> : null}
                  {canRestoreCurrency && canPermanentlyDeleteCurrency ? <DropdownMenuSeparator /> : null}
                  {canPermanentlyDeleteCurrency ? <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(currency, "permanent")}>Delete permanently</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [canPermanentlyDeleteCurrency, canRestoreCurrency, onOpenAction],
  )

  const deletedTable = useReactTable({ data: deletedCurrencies, columns: deletedColumns, getCoreRowModel: getCoreRowModel() })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Deleted currencies</CardTitle>
            <CardDescription>Restore old soft deleted currencies or remove them permanently.</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
            {deletedMeta?.total ?? deletedCurrencies.length} deleted
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-b border-slate-200/70 p-4 dark:border-white/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid w-full gap-3 sm:grid-cols-1 lg:max-w-xl">
              <div className="space-y-1">
                <label htmlFor="deletedCurrencyName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Currency name</label>
                <Input
                  id="deletedCurrencyName"
                  value={deletedDraftFilters.currencyName}
                  className="h-9 rounded-md px-2 text-xs"
                  onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, currencyName: event.target.value })}
                  placeholder="Input currency name"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="deletedCurrencyCode" className="text-xs font-medium text-slate-700 dark:text-slate-300">Currency code</label>
                <Input
                  id="deletedCurrencyCode"
                  value={deletedDraftFilters.currencyCode}
                  className="h-9 rounded-md px-2 text-xs"
                  onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, currencyCode: event.target.value })}
                  placeholder="Input currency code"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="deletedCurrencySymbol" className="text-xs font-medium text-slate-700 dark:text-slate-300">Symbol</label>
                <Input
                  id="deletedCurrencySymbol"
                  value={deletedDraftFilters.symbol}
                  className="h-9 rounded-md px-2 text-xs"
                  onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, symbol: event.target.value })}
                  placeholder="Input symbol"
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
                  const cleared = { currencyName: "", currencyCode: "", symbol: "" }
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
            <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
          </div>
        </div>

        {deletedError ? (
          <div className="p-4">
            <EmptyState title="Unable to load deleted currencies" description={deletedError} />
          </div>
        ) : null}

        {!deletedError ? (
          <>
            <div className="lg:hidden">
              {loadingDeletedCurrencies ? (
                <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}</div>
              ) : deletedCurrencies.length > 0 ? (
                <div className="space-y-3 p-4">
                  {deletedCurrencies.map((currency) => (
                    <article key={currency.id} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{currency.currencyName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {currency.currencyCode} - {currency.symbol}
                          </p>
                        </div>
                        {canRestoreCurrency || canPermanentlyDeleteCurrency ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {canRestoreCurrency ? <DropdownMenuItem onSelect={() => onOpenAction(currency, "restore")}>Restore currency</DropdownMenuItem> : null}
                              {canRestoreCurrency && canPermanentlyDeleteCurrency ? <DropdownMenuSeparator /> : null}
                              {canPermanentlyDeleteCurrency ? <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(currency, "permanent")}>Delete permanently</DropdownMenuItem> : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Deleted: {formatDate(currency.deleted_at)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState
                    title="No deleted currencies found"
                    description={deletedFiltersActive ? "Try clearing or relaxing the current filters." : "Soft deleted currencies will appear here when users remove them."}
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(1)} disabled={loadingDeletedCurrencies || deletedPage <= 1}>
                    <ChevronsLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.max(1, deletedPage - 1))} disabled={loadingDeletedCurrencies || deletedPage <= 1}>
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.min(deletedMeta?.totalPages ?? 1, deletedPage + 1))} disabled={loadingDeletedCurrencies || deletedPage >= (deletedMeta?.totalPages ?? 1)}>
                    <ChevronRight className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(deletedMeta?.totalPages ?? 1)} disabled={loadingDeletedCurrencies || deletedPage >= (deletedMeta?.totalPages ?? 1)}>
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
                isLoading={loadingDeletedCurrencies}
                pageSizeOptions={[5, 10, 25, 50]}
                onPageChange={(nextPage) => onDeletedPageChange(nextPage)}
                onPageSizeChange={(nextPageSize) => {
                  onDeletedLimitChange(nextPageSize)
                  onDeletedPageChange(1)
                }}
                emptyState={
                  <EmptyState
                    title="No deleted currencies found"
                    description={deletedFiltersActive ? "Try clearing or relaxing the current filters." : "Soft deleted currencies will appear here when users remove them."}
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
