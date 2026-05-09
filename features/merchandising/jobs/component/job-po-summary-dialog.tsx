"use client"

import { useCallback, useState, type FormEvent, type ReactNode } from "react"
import { Loader2, Search } from "lucide-react"

import {
  AppCombobox,
  type AppComboboxLoadParams,
  type AppComboboxOption,
} from "@/components/app-combobox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

import type { JobPoSummaryResult } from "../job.types"

type JobPoSummaryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSearch: (poNumber: string) => Promise<JobPoSummaryResult>
}

type PoSummaryOption = AppComboboxOption & {
  jobCount: number
  rowCount: number
}

function formatSummaryNumber(value: number | string | null | undefined) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return "0"
  }

  if (Number.isInteger(numberValue)) {
    return String(numberValue)
  }

  return numberValue.toFixed(2).replace(/\.?0+$/, "")
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

export function JobPoSummaryDialog({
  open,
  onOpenChange,
  onSearch,
}: JobPoSummaryDialogProps) {
  const [selectedPoOption, setSelectedPoOption] = useState<PoSummaryOption | null>(null)
  const [poComboboxOpen, setPoComboboxOpen] = useState(false)
  const [result, setResult] = useState<JobPoSummaryResult | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const loadPoOptions = useCallback(
    async ({
      query,
    }: AppComboboxLoadParams): Promise<{ items: PoSummaryOption[]; hasNextPage: boolean }> => {
      const searchQuery = query.trim()

      if (!searchQuery) {
        return { items: [], hasNextPage: false }
      }

      const summary = await onSearch(searchQuery)

      return {
        items: summary.groups.map((group) => ({
          label: group.poNumber,
          value: group.poNumber,
          jobCount: group.jobCount,
          rowCount: group.rowCount,
        })),
        hasNextPage: false,
      }
    },
    [onSearch]
  )

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextSearchText = selectedPoOption?.value.trim() ?? ""

    if (!nextSearchText) {
      setError("Please enter a PO number to view the summary.")
      setResult(null)
      setSearched(false)
      return
    }

    setLoading(true)
    setError("")
    setSearched(true)

    try {
      setResult(await onSearch(nextSearchText))
    } catch (caughtError) {
      setResult(null)
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load PO summary right now."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-1/2 top-1/2 grid h-[min(92dvh,760px)] max-h-[92dvh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-lg p-0 sm:h-[min(86dvh,720px)] sm:w-[min(980px,calc(100vw-2rem))] sm:max-w-[min(980px,calc(100vw-2rem))] xl:w-[min(1080px,calc(100vw-3rem))] xl:max-w-[min(1080px,calc(100vw-3rem))] 2xl:w-[min(1180px,calc(100vw-4rem))] 2xl:max-w-[min(1180px,calc(100vw-4rem))]">
        <DialogHeader className="min-w-0 border-b border-slate-200/70 px-4 py-3 pr-10 dark:border-white/10">
          <DialogTitle>PO Summary</DialogTitle>
          <DialogDescription className="max-w-full">
            Search a saved PO number and review database-entered details for
            verification.
          </DialogDescription>
        </DialogHeader>

        <form
          className="min-w-0 border-b border-slate-200/70 px-4 py-3 dark:border-white/10"
          onSubmit={handleSearch}
        >
          <div className="space-y-1.5">
            <Label htmlFor="job-po-summary-search" className="text-xs">
              PO Number
            </Label>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
              <AppCombobox<PoSummaryOption>
                open={poComboboxOpen}
                onOpenChange={setPoComboboxOpen}
                value={selectedPoOption}
                onValueChange={(option) => {
                  setSelectedPoOption(option)
                  setError("")
                  if (!option) {
                    setSearched(false)
                    setResult(null)
                  }
                }}
                loadItems={loadPoOptions}
                initialLimit={10}
                searchLimit={10}
                placeholder="Search PO number"
                emptyMessage="Type a PO number to search saved entries."
                loadingMessage="Searching PO numbers..."
                showClear={Boolean(selectedPoOption)}
                inputClassName="h-7 rounded-md px-2 text-xs"
                inputProps={{ id: "job-po-summary-search" }}
                contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
                renderItem={(item) => (
                  <div className="flex w-full min-w-0 items-center justify-between gap-3">
                    <span className="min-w-0 truncate">{item.label}</span>
                    <span className="shrink-0 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      {item.jobCount} job{item.jobCount === 1 ? "" : "s"} ·{" "}
                      {item.rowCount} row{item.rowCount === 1 ? "" : "s"}
                    </span>
                  </div>
                )}
              />
            </div>
            <Button
              type="submit"
              className="h-7 rounded-md px-3 text-xs"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Search className="size-3.5" />
              )}
              Search
            </Button>
            </div>
          </div>
          {error ? (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          ) : null}
        </form>

        <ScrollArea
          className="min-h-0 min-w-0 max-w-full overflow-hidden"
          viewportClassName="overflow-x-hidden [&>div]:!block [&>div]:!w-full [&>div]:!min-w-0 [&>div]:!max-w-full"
        >
          <div className="w-full max-w-full min-w-0 space-y-3 overflow-x-hidden p-3 sm:p-4">
            {result ? (
              <>
                <div className="grid min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-4">
                  <SummaryTile label="Jobs" value={result.totalJobCount} />
                  <SummaryTile
                    label="Total Qty"
                    value={formatSummaryNumber(result.totalQuantity)}
                  />
                  <SummaryTile
                    label="Total FOB"
                    value={formatSummaryNumber(result.totalFob)}
                  />
                  <SummaryTile
                    label="Total CM"
                    value={formatSummaryNumber(result.totalCm)}
                  />
                </div>

                {result.groups.length ? (
                  result.groups.map((group) => (
                    <div
                      key={group.poNumber}
                      className="max-w-full min-w-0 overflow-hidden rounded-lg border border-slate-200/70 bg-white/75 dark:border-white/10 dark:bg-[#17131d]/80"
                    >
                      <div className="flex flex-col gap-2 border-b border-slate-200/70 px-3 py-2 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {group.poNumber}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {group.jobCount} job
                            {group.jobCount === 1 ? "" : "s"} ·{" "}
                            {group.rowCount} row
                            {group.rowCount === 1 ? "" : "s"} found
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="secondary">
                            Qty {formatSummaryNumber(group.totalQuantity)}
                          </Badge>
                          <Badge variant="secondary">
                            FOB {formatSummaryNumber(group.totalFob)}
                          </Badge>
                          <Badge variant="secondary">
                            CM {formatSummaryNumber(group.totalCm)}
                          </Badge>
                        </div>
                      </div>

                      <div className="max-w-full min-w-0 overflow-x-auto">
                        <table className="w-full min-w-[1280px] border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200/70 dark:border-white/10">
                              <th className="px-2 py-2 text-left font-medium">
                                Job No
                              </th>
                              <th className="px-2 py-2 text-left font-medium">
                                PO Number
                              </th>
                              <th className="px-2 py-2 text-left font-medium">
                                Style
                              </th>
                              <th className="px-2 py-2 text-left font-medium">
                                Size
                              </th>
                              <th className="px-2 py-2 text-left font-medium">
                                Color
                              </th>
                              <th className="px-2 py-2 text-right font-medium">
                                Qty
                              </th>
                              <th className="px-2 py-2 text-right font-medium">
                                FOB
                              </th>
                              <th className="px-2 py-2 text-right font-medium">
                                Total FOB
                              </th>
                              <th className="px-2 py-2 text-right font-medium">
                                CM/Dzn
                              </th>
                              <th className="px-2 py-2 text-left font-medium">
                                Delivery
                              </th>
                              <th className="px-2 py-2 text-right font-medium">
                                Cutting Limit %
                              </th>
                              <th className="px-2 py-2 text-left font-medium">
                                Remarks
                              </th>
                              <th className="px-2 py-2 text-left font-medium">
                                Factory
                              </th>
                              <th className="px-2 py-2 text-left font-medium">
                                Buyer
                              </th>
                              <th className="px-2 py-2 text-left font-medium">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.rows.map((row) => (
                              <tr
                                key={row.id}
                                className="border-b border-slate-100 last:border-b-0 dark:border-white/10"
                              >
                                <td className="px-2 py-2">{row.jobNo}</td>
                                <td className="px-2 py-2">{row.poNumber}</td>
                                <td className="px-2 py-2">
                                  <div className="font-medium">
                                    {row.styleNo}
                                  </div>
                                  {row.styleName ? (
                                    <div className="text-slate-500 dark:text-slate-400">
                                      {row.styleName}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="px-2 py-2">{row.sizeName}</td>
                                <td className="px-2 py-2">{row.colorName}</td>
                                <td className="px-2 py-2 text-right">
                                  {formatSummaryNumber(row.quantity)}
                                </td>
                                <td className="px-2 py-2 text-right">
                                  {formatSummaryNumber(row.fob)}
                                </td>
                                <td className="px-2 py-2 text-right">
                                  {formatSummaryNumber(row.totalFob)}
                                </td>
                                <td className="px-2 py-2 text-right">
                                  {formatSummaryNumber(row.cmPerDzn)}
                                </td>
                                <td className="px-2 py-2">
                                  {formatDate(row.deliveryDate)}
                                </td>
                                <td className="px-2 py-2 text-right">
                                  {formatSummaryNumber(
                                    row.cuttingLimitPercentage
                                  )}
                                </td>
                                <td className="px-2 py-2">
                                  {row.remarks || "-"}
                                </td>
                                <td className="px-2 py-2">
                                  {row.factoryName}
                                </td>
                                <td className="px-2 py-2">{row.buyerName}</td>
                                <td className="px-2 py-2">
                                  <Badge
                                    variant={
                                      row.isActive ? "secondary" : "outline"
                                    }
                                  >
                                    {row.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptySummary search={result.search} />
                )}
              </>
            ) : searched && !loading && !error ? (
              <EmptySummary search={selectedPoOption?.label ?? ""} />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200/70 px-4 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                Enter a PO number to review saved entry coverage.
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-slate-200/70 px-4 py-3 dark:border-white/10">
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-md px-3 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SummaryTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200/70 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 min-w-0 break-words text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  )
}

function EmptySummary({ search }: { search: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200/70 px-4 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
      No saved PO details found for "{search.trim()}".
    </div>
  )
}
