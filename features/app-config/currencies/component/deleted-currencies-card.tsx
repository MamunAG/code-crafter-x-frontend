"use client"

import { useMemo } from "react"
import { MoreHorizontal, Search } from "lucide-react"
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table"

import { AppDataTable } from "@/components/app-data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

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

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 max-w-lg text-sm text-slate-600">{description}</p></div>
}

export function DeletedCurrenciesCard({ deletedCurrencies, deletedMeta, deletedPage, deletedLimit, loadingDeletedCurrencies, deletedError, deletedDraftFilters, deletedActiveFilters, onDeletedDraftFiltersChange, onDeletedActiveFiltersChange, onDeletedPageChange, onDeletedLimitChange, onOpenAction, canRestoreCurrency, canPermanentlyDeleteCurrency }: Props) {
  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) return "No deleted currencies found"
    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])
  const deletedFiltersActive = Boolean(deletedActiveFilters.currencyName || deletedActiveFilters.currencyCode || deletedActiveFilters.symbol)
  const columns = useMemo<ColumnDef<CurrencyRecord>[]>(() => [
    { id: "currency", header: "Currency", cell: ({ row }) => <div className="pl-4"><p className="text-xs font-semibold">{row.original.currencyName}</p><p className="text-[11px] text-slate-500">{row.original.currencyCode} - {row.original.symbol}</p></div> },
    { id: "deleted", header: "Deleted", cell: ({ row }) => <span className="text-xs">{formatDate(row.original.deleted_at)}</span> },
    { id: "actions", header: () => <span className="pr-4">Actions</span>, cell: ({ row }) => (
      <div className="pr-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="rounded-full"><MoreHorizontal className="size-3.5" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canRestoreCurrency ? <DropdownMenuItem onSelect={() => onOpenAction(row.original, "restore")}>Restore currency</DropdownMenuItem> : null}
            {canRestoreCurrency && canPermanentlyDeleteCurrency ? <DropdownMenuSeparator /> : null}
            {canPermanentlyDeleteCurrency ? <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(row.original, "permanent")}>Delete permanently</DropdownMenuItem> : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ) },
  ], [canPermanentlyDeleteCurrency, canRestoreCurrency, onOpenAction])
  const table = useReactTable({ data: deletedCurrencies, columns, getCoreRowModel: getCoreRowModel() })
  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader><div className="flex justify-between"><div><CardTitle className="text-lg">Deleted currencies</CardTitle><CardDescription>Restore old soft deleted currencies or remove them permanently.</CardDescription></div><Badge variant="outline">{deletedMeta?.total ?? deletedCurrencies.length} deleted</Badge></div></CardHeader>
      <CardContent className="p-0">
        <div className="border-b border-slate-200/70 p-4">
          <form onSubmit={(e) => { e.preventDefault(); onDeletedActiveFiltersChange(deletedDraftFilters); onDeletedPageChange(1) }} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(["currencyName", "currencyCode", "symbol"] as const).map((field) => <Input key={field} value={deletedDraftFilters[field]} onChange={(e) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, [field]: e.target.value })} placeholder={field} />)}
            <div className="flex gap-2"><Button type="submit"><Search className="size-3.5" />Search</Button><Button type="button" variant="outline" onClick={() => { const cleared = { currencyName: "", currencyCode: "", symbol: "" }; onDeletedDraftFiltersChange(cleared); onDeletedActiveFiltersChange(cleared); onDeletedPageChange(1) }}>Reset</Button></div>
          </form>
        </div>
        {deletedError ? <div className="p-4"><EmptyState title="Unable to load deleted currencies" description={deletedError} /></div> : <AppDataTable table={table} pageSummary={deletedPageSummary} page={deletedPage} totalPages={deletedMeta?.totalPages ?? 1} pageSize={deletedLimit} isLoading={loadingDeletedCurrencies} pageSizeOptions={[5,10,25,50]} onPageChange={(nextPage) => onDeletedPageChange(nextPage)} onPageSizeChange={(nextPageSize) => { onDeletedLimitChange(nextPageSize); onDeletedPageChange(1) }} emptyState={<EmptyState title="No deleted currencies found" description={deletedFiltersActive ? "Try clearing or relaxing the current filters." : "Soft deleted currencies will appear here when users remove them."} />} />}
      </CardContent>
    </Card>
  )
}
