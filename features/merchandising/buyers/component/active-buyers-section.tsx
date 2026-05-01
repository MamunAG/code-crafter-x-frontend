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

import type { CountrySummary, PaginationMeta, BuyerFilterValues, BuyerRecord } from "../buyer.types"

const ALL_STATUS_VALUE = "__all_statuses__"

type CountryFilterOption = CountrySummary & AppComboboxOption

type BuyerTableSectionProps = {
  buyers: BuyerRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loadingBuyers: boolean
  draftFilters: BuyerFilterValues
  activeFilters: BuyerFilterValues
  countryOptions: CountrySummary[]
  loadCountryOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<CountryFilterOption>>
  onDraftFiltersChange: (nextValues: BuyerFilterValues) => void
  onActiveFiltersChange: (nextValues: BuyerFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreateBuyer: () => void
  onEditBuyer: (buyerId: string) => void
  onDeleteBuyer: (buyer: BuyerRecord) => void
  onResetFilters: () => void
  onDownloadTemplate: () => void
  onUploadTemplate: () => void
  canCreateBuyer: boolean
  canUpdateBuyer: boolean
  canDeleteBuyer: boolean
  downloadingTemplate: boolean
  uploadingTemplate: boolean
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

function buyerStatusTone(buyer?: BuyerRecord | null) {
  if (!buyer) return "outline" as const
  if (buyer.deleted_at) return "destructive" as const
  return buyer.isActive === false ? "outline" : "secondary"
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

export function ActiveBuyersSection({
  buyers,
  meta,
  page,
  limit,
  loadingBuyers,
  draftFilters,
  activeFilters,
  countryOptions,
  loadCountryOptions,
  onDraftFiltersChange,
  onActiveFiltersChange,
  onPageChange,
  onLimitChange,
  onCreateBuyer,
  onEditBuyer,
  onDeleteBuyer,
  onResetFilters,
  onDownloadTemplate,
  onUploadTemplate,
  canCreateBuyer,
  canUpdateBuyer,
  canDeleteBuyer,
  downloadingTemplate,
  uploadingTemplate,
}: BuyerTableSectionProps) {
  const [selectedFilterCountry, setSelectedFilterCountry] = useState<CountryFilterOption | null>(null)
  const selectableCountries = useMemo(
    () =>
      countryOptions
        .filter((country) => country.id != null)
        .map<CountryFilterOption>((country) => ({
          ...country,
          label: country.name ?? "",
          value: String(country.id),
        })),
    [countryOptions],
  )
  const derivedFilterCountry = useMemo(
    () => selectableCountries.find((country) => country.value === draftFilters.countryId) ?? null,
    [draftFilters.countryId, selectableCountries],
  )
  const filterCountryValue =
    draftFilters.countryId && selectedFilterCountry?.value === draftFilters.countryId
      ? selectedFilterCountry
      : derivedFilterCountry

  const filterCount = useMemo(
    () =>
      [
        draftFilters.name,
        draftFilters.displayName,
        draftFilters.contact,
        draftFilters.email,
        draftFilters.countryId,
        draftFilters.address,
        draftFilters.isActive,
        draftFilters.remarks,
      ].filter((value) => value.trim()).length,
    [draftFilters],
  )

  const filtersActive = Boolean(
    activeFilters.name ||
    activeFilters.displayName ||
    activeFilters.contact ||
    activeFilters.email ||
    activeFilters.countryId ||
    activeFilters.address ||
    activeFilters.isActive ||
    activeFilters.remarks,
  )

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No buyers found"
    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<BuyerRecord>[]>(
    () => [
      {
        id: "name",
        header: "Buyer",
        cell: ({ row }) => (
          <div className="pl-4">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
                {(row.original.name?.trim() || "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{row.original.name}</p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{row.original.displayName}</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.original.contact}</span>
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
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const buyer = row.original
          const tone = buyerStatusTone(buyer)
          const label = buyer.deleted_at ? "Deleted" : buyer.isActive === false ? "Inactive" : "Active"
          return <Badge variant={tone} className="rounded-full px-3 py-1">{label}</Badge>
        },
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => {
          const buyer = row.original
          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(buyer.created_at)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserLabel(buyer.created_by_user, buyer.created_by_id)
                  ? `Created by ${getUserLabel(buyer.created_by_user, buyer.created_by_id)}`
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
          const buyer = row.original
          const hasUpdateMetadata = Boolean(buyer.updated_by_id || buyer.updated_by_user)

          return (
            <div className="space-y-1">
              {hasUpdateMetadata ? (
                <>
                  <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(buyer.updated_at)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {getUserLabel(buyer.updated_by_user, buyer.updated_by_id)
                      ? `Updated by ${getUserLabel(buyer.updated_by_user, buyer.updated_by_id)}`
                      : "No editor metadata"}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">Not edited yet</p>
              )}
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const buyer = row.original
          const hasActions = canUpdateBuyer || canDeleteBuyer

          if (!hasActions) {
            return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>
          }

          return (
            <div className="pr-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {canUpdateBuyer ? <DropdownMenuItem onSelect={() => onEditBuyer(buyer.id)}>Edit buyer</DropdownMenuItem> : null}
                  {canUpdateBuyer && canDeleteBuyer ? <DropdownMenuSeparator /> : null}
                  {canDeleteBuyer ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => onDeleteBuyer(buyer)}>
                      Delete buyer
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [canDeleteBuyer, canUpdateBuyer, onDeleteBuyer, onEditBuyer],
  )

  const table = useReactTable({
    data: buyers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Buyers table</CardTitle>
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
                <Button type="button" variant="outline" className="rounded-full" disabled={!canCreateBuyer}>
                  <MoreHorizontal className="size-2.5" />
                  {/* Bulk actions */}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={onDownloadTemplate} disabled={downloadingTemplate}>
                  <Download className="mr-2 size-3.5" />
                  {downloadingTemplate ? "Downloading template..." : "Download template"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onUploadTemplate} disabled={uploadingTemplate}>
                  <Upload className="mr-2 size-3.5" />
                  {uploadingTemplate ? "Uploading buyers..." : "Upload buyers"}
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
            <label htmlFor="filterBuyerName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Buyer name</label>
            <Input id="filterBuyerName" value={draftFilters.name} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDraftFiltersChange({ ...draftFilters, name: event.target.value })} placeholder="Input buyer name" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterBuyerDisplayName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Display name</label>
            <Input id="filterBuyerDisplayName" value={draftFilters.displayName} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDraftFiltersChange({ ...draftFilters, displayName: event.target.value })} placeholder="Input display name" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterBuyerContact" className="text-xs font-medium text-slate-700 dark:text-slate-300">Contact</label>
            <Input id="filterBuyerContact" value={draftFilters.contact} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDraftFiltersChange({ ...draftFilters, contact: event.target.value })} placeholder="Input contact" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterBuyerEmail" className="text-xs font-medium text-slate-700 dark:text-slate-300">Email</label>
            <Input id="filterBuyerEmail" value={draftFilters.email} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDraftFiltersChange({ ...draftFilters, email: event.target.value })} placeholder="Input email" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterBuyerCountry" className="text-xs font-medium text-slate-700 dark:text-slate-300">Country</label>
            <AppCombobox
              value={filterCountryValue}
              onValueChange={(country) => {
                setSelectedFilterCountry(country)
                onDraftFiltersChange({ ...draftFilters, countryId: country?.value ?? "" })
              }}
              loadItems={loadCountryOptions}
              initialLimit={10}
              searchLimit={10}
              inputProps={{ id: "filterBuyerCountry" }}
              placeholder="All countries"
              loadingMessage="Loading countries..."
              emptyMessage="No countries match your search."
              showClear={Boolean(draftFilters.countryId)}
              inputClassName="h-7 rounded-md px-2 text-xs"
              contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterBuyerStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
            <Select
              value={draftFilters.isActive || ALL_STATUS_VALUE}
              onValueChange={(value) => onDraftFiltersChange({ ...draftFilters, isActive: value === ALL_STATUS_VALUE ? "" : value })}
            >
              <SelectTrigger id="filterBuyerStatus" className="h-7 w-full rounded-md px-2 text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUS_VALUE}>All statuses</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-6">
            <Button type="submit" className="w-full rounded-xl sm:w-auto">
              <Search className="size-3.5" />
              Search
            </Button>
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={onResetFilters}>
              Reset
            </Button>
            {canCreateBuyer ? (
              <Button type="button" onClick={onCreateBuyer} className="w-full rounded-xl sm:w-auto">
                <UserRound className="size-3.5" />
                New buyer
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>

      <CardContent className="p-0 border-t border-slate-200/70 dark:border-white/10">
        <div className="lg:hidden">
          {loadingBuyers ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : buyers.length > 0 ? (
            <div className="space-y-3 p-4">
              {buyers.map((buyer) => {
                const tone = buyerStatusTone(buyer)
                const label = buyer.deleted_at ? "Deleted" : buyer.isActive === false ? "Inactive" : "Active"

                return (
                  <article
                    key={buyer.id}
                    className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                            {(buyer.name?.trim() || "?").charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{buyer.name}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{buyer.displayName}</p>
                          </div>
                        </div>
                      </div>

                      {canUpdateBuyer || canDeleteBuyer ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                              <MoreHorizontal className="size-3.5" />
                              <span className="sr-only">Open actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {canUpdateBuyer ? <DropdownMenuItem onSelect={() => onEditBuyer(buyer.id)}>Edit buyer</DropdownMenuItem> : null}
                            {canUpdateBuyer && canDeleteBuyer ? <DropdownMenuSeparator /> : null}
                            {canDeleteBuyer ? <DropdownMenuItem variant="destructive" onSelect={() => onDeleteBuyer(buyer)}>Delete buyer</DropdownMenuItem> : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={tone} className="rounded-full px-3 py-1">{label}</Badge>
                      <Badge variant="outline" className="rounded-full px-3 py-1">{getCountryLabel(buyer.country, buyer.countryId)}</Badge>
                    </div>

                    <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <p>Contact: {buyer.contact}</p>
                      <p>Email: {buyer.email}</p>
                      <p>Created: {formatDate(buyer.created_at)}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                title="No buyers found"
                description={
                  filtersActive
                    ? "Try clearing or relaxing the current filters."
                    : canCreateBuyer
                      ? "Create the first buyer to get started."
                      : "No buyer records are available for the selected organization."
                }
                actionLabel={filtersActive || !canCreateBuyer ? "Reset filters" : "New buyer"}
                onAction={filtersActive || !canCreateBuyer ? onResetFilters : onCreateBuyer}
              />
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">{pageSummary}</p>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(1)} disabled={loadingBuyers || page <= 1}>
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.max(1, current - 1))} disabled={loadingBuyers || page <= 1}>
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.min(meta?.totalPages ?? 1, current + 1))} disabled={loadingBuyers || page >= (meta?.totalPages ?? 1)}>
                <ChevronRight className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(meta?.totalPages ?? 1)} disabled={loadingBuyers || page >= (meta?.totalPages ?? 1)}>
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
            isLoading={loadingBuyers}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={(nextPage) => onPageChange(nextPage)}
            onPageSizeChange={(nextPageSize) => onLimitChange(nextPageSize)}
            emptyState={
              <EmptyState
                title="No buyers found"
                description={
                  filtersActive
                    ? "Try clearing or relaxing the current filters."
                    : canCreateBuyer
                      ? "Create the first buyer to get started."
                      : "No buyer records are available for the selected organization."
                }
                actionLabel={filtersActive || !canCreateBuyer ? "Reset filters" : "New buyer"}
                onAction={filtersActive || !canCreateBuyer ? onResetFilters : onCreateBuyer}
              />
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
