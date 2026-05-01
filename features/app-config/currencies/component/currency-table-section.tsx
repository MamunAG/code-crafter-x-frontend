"use client"

import { useMemo } from "react"
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Banknote, Download, MoreHorizontal, Search, Upload } from "lucide-react"

import { AppDataTable } from "@/components/app-data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

import type { CurrencyFilterValues, CurrencyRecord, PaginationMeta } from "../currency.types"

type CurrencyTableSectionProps = {
  currencies: CurrencyRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loadingCurrencies: boolean
  draftFilters: CurrencyFilterValues
  activeFilters: CurrencyFilterValues
  onDraftFiltersChange: (nextValues: CurrencyFilterValues) => void
  onActiveFiltersChange: (nextValues: CurrencyFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreateCurrency: () => void
  onEditCurrency: (currencyId: number) => void
  onDeleteCurrency: (currency: CurrencyRecord) => void
  onResetFilters: () => void
  onDownloadTemplate: () => void
  onUploadTemplate: () => void
  canCreateCurrency: boolean
  canUpdateCurrency: boolean
  canDeleteCurrency: boolean
  downloadingTemplate: boolean
  uploadingTemplate: boolean
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function userLabel(user?: { name?: string | null } | null, fallback?: string | null) {
  return user?.name?.trim() || fallback?.trim() || ""
}

function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <Banknote className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">
        {actionLabel}
      </Button>
    </div>
  )
}

export function CurrencyTableSection({
  currencies,
  meta,
  page,
  limit,
  loadingCurrencies,
  draftFilters,
  activeFilters,
  onDraftFiltersChange,
  onActiveFiltersChange,
  onPageChange,
  onLimitChange,
  onCreateCurrency,
  onEditCurrency,
  onDeleteCurrency,
  onResetFilters,
  onDownloadTemplate,
  onUploadTemplate,
  canCreateCurrency,
  canUpdateCurrency,
  canDeleteCurrency,
  downloadingTemplate,
  uploadingTemplate,
}: CurrencyTableSectionProps) {
  const filterCount = useMemo(() => [draftFilters.currencyName, draftFilters.currencyCode, draftFilters.symbol].filter((value) => value.trim()).length, [draftFilters])
  const filtersActive = Boolean(activeFilters.currencyName || activeFilters.currencyCode || activeFilters.symbol)

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No currencies found"
    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<CurrencyRecord>[]>(
    () => [
      {
        id: "currency",
        header: "Currency",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="text-xs font-semibold text-slate-950 dark:text-slate-50">{row.original.currencyName}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {row.original.currencyCode} - {row.original.symbol}
            </p>
          </div>
        ),
      },
      { id: "rate", header: "Rate", cell: ({ row }) => <span className="text-xs font-medium">{row.original.rate}</span> },
      {
        id: "flags",
        header: "Flags",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Badge variant={row.original.isActive === false ? "outline" : "secondary"}>{row.original.isActive === false ? "Inactive" : "Active"}</Badge>
            {row.original.isDefault ? <Badge variant="outline">Default</Badge> : null}
          </div>
        ),
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-xs">{formatDate(row.original.created_at)}</p>
            <p className="text-[11px] text-slate-500">{userLabel(row.original.created_by_user, row.original.created_by_id) || "No creator metadata"}</p>
          </div>
        ),
      },
      {
        id: "updated",
        header: "Updated",
        cell: ({ row }) =>
          row.original.updated_by_id || row.original.updated_by_user ? (
            <div className="space-y-1">
              <p className="text-xs">{formatDate(row.original.updated_at)}</p>
              <p className="text-[11px] text-slate-500">{userLabel(row.original.updated_by_user, row.original.updated_by_id) || "No editor metadata"}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Not edited yet</p>
          ),
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          if (!canUpdateCurrency && !canDeleteCurrency) return <div className="pr-4 text-right text-xs text-slate-400">No actions</div>
          return (
            <div className="pr-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canUpdateCurrency ? <DropdownMenuItem onSelect={() => onEditCurrency(row.original.id)}>Edit currency</DropdownMenuItem> : null}
                  {canUpdateCurrency && canDeleteCurrency ? <DropdownMenuSeparator /> : null}
                  {canDeleteCurrency ? <DropdownMenuItem variant="destructive" onSelect={() => onDeleteCurrency(row.original)}>Delete currency</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [canDeleteCurrency, canUpdateCurrency, onDeleteCurrency, onEditCurrency],
  )

  const table = useReactTable({ data: currencies, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <>
      <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
        <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription className="text-xs">Search by currency name, code, or symbol.</CardDescription>
            </div>
            <Badge variant="outline">{filterCount} active filter{filterCount === 1 ? "" : "s"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-0 sm:px-2">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onActiveFiltersChange(draftFilters)
              onPageChange(1)
            }}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            {(["currencyName", "currencyCode", "symbol"] as const).map((field) => (
              <div key={field} className="space-y-1">
                <label className="text-xs font-medium">{field === "currencyName" ? "Currency name" : field === "currencyCode" ? "Currency code" : "Symbol"}</label>
                <Input value={draftFilters[field]} onChange={(e) => onDraftFiltersChange({ ...draftFilters, [field]: e.target.value })} className="h-9 rounded-md px-2 text-xs" />
              </div>
            ))}
            <div className="flex gap-2 sm:items-end">
              <Button type="submit" className="rounded-xl">
                <Search className="size-3.5" />
                Search
              </Button>
              <Button type="button" variant="outline" onClick={onResetFilters} className="rounded-xl">
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
              <CardTitle className="text-lg">Currencies table</CardTitle>
              <CardDescription>{pageSummary}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {canCreateCurrency ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="icon-sm" className="rounded-full">
                      <MoreHorizontal className="size-3.5" />
                      <span className="sr-only">Open currency bulk actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onSelect={onDownloadTemplate} disabled={downloadingTemplate}>
                      <Download className="size-3.5" />
                      Download template
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onUploadTemplate} disabled={uploadingTemplate}>
                      <Upload className="size-3.5" />
                      Upload currencies
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              <Badge variant="outline">Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <AppDataTable
            table={table}
            pageSummary={pageSummary}
            page={page}
            totalPages={meta?.totalPages ?? 1}
            pageSize={limit}
            isLoading={loadingCurrencies}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={(nextPage) => onPageChange(nextPage)}
            onPageSizeChange={(nextPageSize) => {
              onLimitChange(nextPageSize)
              onPageChange(1)
            }}
            emptyState={
              <EmptyState
                title="No currencies found"
                description={filtersActive ? "Try clearing or relaxing the current filters." : canCreateCurrency ? "Create the first currency to get started." : "No currency records are available for the selected organization."}
                actionLabel={filtersActive || !canCreateCurrency ? "Reset filters" : "New currency"}
                onAction={filtersActive || !canCreateCurrency ? onResetFilters : onCreateCurrency}
              />
            }
          />
        </CardContent>
      </Card>
    </>
  )
}
