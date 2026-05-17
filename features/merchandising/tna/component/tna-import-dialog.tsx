"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type UIEvent } from "react"

import { Download, Loader2 } from "lucide-react"

import { AppCombobox, type AppComboboxLoadParams, type AppComboboxLoadResult, type AppComboboxOption } from "@/components/app-combobox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { renderTnaRelationFormula } from "../tna-formula.utils"
import type { TnaDetailFormValues, TnaRecord } from "../tna.types"

type BuyerOption = AppComboboxOption
type JobOption = AppComboboxOption

export type ImportTnaOption = AppComboboxOption & { record: TnaRecord }

export type LoadImportTnaOptionsParams = AppComboboxLoadParams & {
  buyerId?: string
  jobId?: string
}

type TnaImportDialogProps = {
  open: boolean
  currentDetails: TnaDetailFormValues[]
  currentTnaId?: string | null
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<BuyerOption>>
  loadJobOptions: (params: AppComboboxLoadParams, buyerId?: string) => Promise<AppComboboxLoadResult<JobOption>>
  loadImportTnaOptions: (params: LoadImportTnaOptionsParams) => Promise<AppComboboxLoadResult<ImportTnaOption>>
  loadImportTnaRecord: (id: string) => Promise<TnaRecord>
  onImportRows: (rows: TnaDetailFormValues[]) => void
  onOpenChange: (open: boolean) => void
}

function importedDetailRows(record: TnaRecord): TnaDetailFormValues[] {
  return (record.tnaDetails ?? []).map((detail) => ({
    id: crypto.randomUUID(),
    taskId: detail.taskId ?? "",
    executionDate: detail.executionDate ? String(detail.executionDate).slice(0, 10) : "",
    days: String(detail.days ?? 0),
    sortOrder: detail.sortOrder ?? undefined,
    relationFormula: detail.relationFormula ?? "",
  }))
}

function hasMeaningfulDetailRows(details: TnaDetailFormValues[]) {
  if (details.length !== 1) return details.length > 0

  const detail = details[0]
  if (!detail) return false

  return Boolean(
    detail.taskId.trim() ||
    detail.executionDate.trim() ||
    detail.relationFormula.trim() ||
    (detail.days.trim() && detail.days.trim() !== "0"),
  )
}

function getImportBuyerLabel(record: TnaRecord | null) {
  return record?.buyer?.displayName?.trim() || record?.buyer?.name?.trim() || record?.buyerId || "Selected buyer"
}

function getImportJobLabel(record: TnaRecord | null) {
  return record?.job?.jobNo?.trim() || record?.jobId || "Selected job"
}

function getPreparedByLabel(record: TnaRecord | null) {
  return record?.created_by_user?.name?.trim() || record?.created_by_id || "No creator metadata"
}

function formatDate(value?: string | null) {
  if (!value) return "-"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed)
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-950 dark:text-slate-50">{value || "-"}</p>
    </div>
  )
}

function ListCellTooltip({ children, value, className }: { children: ReactNode; value: string; className: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>{children}</span>
      </TooltipTrigger>
      <TooltipContent side="top" align="start">
        {value}
      </TooltipContent>
    </Tooltip>
  )
}

function getTaskLabelsById(record: TnaRecord | null) {
  return (record?.tnaDetails ?? []).reduce<Record<string, string>>((labels, detail) => {
    const taskId = detail.taskId?.trim()
    if (taskId) {
      labels[taskId] = detail.task?.name?.trim() || taskId
    }
    return labels
  }, {})
}

function renderImportFormula(formula: string | null | undefined, taskLabelsById: Record<string, string>) {
  const renderedFormula = renderTnaRelationFormula(formula?.trim() ?? "", taskLabelsById).trim()
  return renderedFormula || "-"
}

export function TnaImportDialog({
  open,
  currentDetails,
  currentTnaId,
  loadBuyerOptions,
  loadJobOptions,
  loadImportTnaOptions,
  loadImportTnaRecord,
  onImportRows,
  onOpenChange,
}: TnaImportDialogProps) {
  const [importBuyer, setImportBuyer] = useState<BuyerOption | null>(null)
  const [importJob, setImportJob] = useState<JobOption | null>(null)
  const [tnaItems, setTnaItems] = useState<ImportTnaOption[]>([])
  const [selectedTna, setSelectedTna] = useState<ImportTnaOption | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<TnaRecord | null>(null)
  const [tnaPage, setTnaPage] = useState(1)
  const [tnaHasNextPage, setTnaHasNextPage] = useState(false)
  const [tnaListLoading, setTnaListLoading] = useState(false)
  const [tnaListLoadingMore, setTnaListLoadingMore] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [importError, setImportError] = useState("")
  const [importingDetails, setImportingDetails] = useState(false)
  const [pendingImportRows, setPendingImportRows] = useState<TnaDetailFormValues[] | null>(null)
  const [replaceImportConfirmOpen, setReplaceImportConfirmOpen] = useState(false)
  const listRequestIdRef = useRef(0)
  const previewRequestIdRef = useRef(0)
  const importBuyerId = importBuyer?.value?.trim() ?? ""
  const importJobId = importJob?.value?.trim() ?? ""
  const selectedTaskLabelsById = useMemo(() => getTaskLabelsById(selectedRecord), [selectedRecord])

  const resetImportState = useCallback(() => {
    setImportBuyer(null)
    setImportJob(null)
    setTnaItems([])
    setSelectedTna(null)
    setSelectedRecord(null)
    setTnaPage(1)
    setTnaHasNextPage(false)
    setTnaListLoading(false)
    setTnaListLoadingMore(false)
    setPreviewLoading(false)
    setImportingDetails(false)
    setImportError("")
    setPendingImportRows(null)
    setReplaceImportConfirmOpen(false)
  }, [])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetImportState()
    }
    onOpenChange(nextOpen)
  }

  function applyImportedRows(rows: TnaDetailFormValues[]) {
    onImportRows(rows)
    resetImportState()
    onOpenChange(false)
  }

  const loadTnaList = useCallback(async (page: number, limit: number, mode: "replace" | "append") => {
    const requestId = listRequestIdRef.current + 1
    listRequestIdRef.current = requestId
    setImportError("")
    if (mode === "replace") {
      setTnaListLoading(true)
    } else {
      setTnaListLoadingMore(true)
    }

    try {
      const result = await loadImportTnaOptions({
        query: "",
        page,
        limit,
        buyerId: importBuyerId || undefined,
        jobId: importJobId || undefined,
      })

      if (requestId !== listRequestIdRef.current) return

      const nextItems = Array.isArray(result) ? result : result.items
      const filteredItems = currentTnaId ? nextItems.filter((item) => item.value !== currentTnaId) : nextItems

      setTnaItems((currentItems) => mode === "replace" ? filteredItems : [...currentItems, ...filteredItems])
      setTnaPage(page)
      setTnaHasNextPage(Array.isArray(result) ? false : Boolean(result.hasNextPage))

      if (mode === "replace") {
        setSelectedTna(null)
        setSelectedRecord(null)
      }
    } catch (caughtError) {
      if (requestId === listRequestIdRef.current) {
        setImportError(caughtError instanceof Error ? caughtError.message : "Unable to load TNA records right now.")
      }
    } finally {
      if (requestId === listRequestIdRef.current) {
        setTnaListLoading(false)
        setTnaListLoadingMore(false)
      }
    }
  }, [currentTnaId, importBuyerId, importJobId, loadImportTnaOptions])

  useEffect(() => {
    if (!open) return

    const timeout = window.setTimeout(() => {
      void loadTnaList(1, 20, "replace")
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [importBuyerId, importJobId, loadTnaList, open])

  async function handleSelectTna(item: ImportTnaOption) {
    setSelectedTna(item)
    setSelectedRecord(item.record)
    setImportError("")
    setPreviewLoading(true)

    const requestId = previewRequestIdRef.current + 1
    previewRequestIdRef.current = requestId

    try {
      const record = await loadImportTnaRecord(item.value)
      if (requestId === previewRequestIdRef.current) {
        setSelectedRecord(record)
      }
    } catch (caughtError) {
      if (requestId === previewRequestIdRef.current) {
        setImportError(caughtError instanceof Error ? caughtError.message : "Unable to load the source TNA record right now.")
      }
    } finally {
      if (requestId === previewRequestIdRef.current) {
        setPreviewLoading(false)
      }
    }
  }

  function handleTnaListScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight

    if (distanceFromBottom > 80 || !tnaHasNextPage || tnaListLoadingMore || tnaListLoading) {
      return
    }

    void loadTnaList(tnaPage + 1, 10, "append")
  }

  async function handleImportDetails() {
    if (!selectedTna?.value || importingDetails) return

    setImportingDetails(true)
    setImportError("")

    try {
      const record = selectedRecord?.id === selectedTna.value ? selectedRecord : await loadImportTnaRecord(selectedTna.value)
      const rows = importedDetailRows(record)

      if (rows.length === 0) {
        setImportError("The selected TNA has no detail rows to import.")
        return
      }

      if (hasMeaningfulDetailRows(currentDetails)) {
        setPendingImportRows(rows)
        setReplaceImportConfirmOpen(true)
        return
      }

      applyImportedRows(rows)
    } catch (caughtError) {
      setImportError(caughtError instanceof Error ? caughtError.message : "Unable to import TNA details right now.")
    } finally {
      setImportingDetails(false)
    }
  }

  const loadImportJobs = useCallback((params: AppComboboxLoadParams) => {
    return loadJobOptions(params, importBuyerId)
  }, [importBuyerId, loadJobOptions])

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Import TNA Details</DialogTitle>
            <DialogDescription>Select a source TNA and import its detail rows into this form.</DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full space-y-1.5 sm:max-w-72">
                <label className="text-sm font-medium">Buyer</label>
                <AppCombobox
                  value={importBuyer}
                  onValueChange={(buyer) => {
                    setImportBuyer(buyer)
                    setImportJob(null)
                    setSelectedTna(null)
                    setSelectedRecord(null)
                    setImportError("")
                  }}
                  loadItems={loadBuyerOptions}
                  initialLimit={10}
                  searchLimit={10}
                  placeholder="Search buyer"
                  loadingMessage="Loading buyers..."
                  emptyMessage="No buyers match your search."
                  showClear={Boolean(importBuyer)}
                  contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
                />
              </div>

              <div className="w-full space-y-1.5 sm:max-w-72">
                <label className="text-sm font-medium">Job</label>
                <AppCombobox
                  key={importBuyerId || "import-buyer-empty"}
                  value={importJob}
                  onValueChange={(job) => {
                    setImportJob(job)
                    setSelectedTna(null)
                    setSelectedRecord(null)
                    setImportError("")
                  }}
                  loadItems={loadImportJobs}
                  initialLimit={10}
                  searchLimit={10}
                  placeholder={importBuyerId ? "Search job" : "Select buyer first"}
                  loadingMessage="Loading jobs..."
                  emptyMessage={importBuyerId ? "No jobs match your search." : "Select a buyer to load matching jobs."}
                  showClear={Boolean(importJob)}
                  disabled={!importBuyerId}
                  contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
                />
              </div>
            </div>

            <div className="grid h-[min(34rem,calc(100vh-17rem))] min-h-[28rem] overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/40 lg:grid-cols-[22rem_minmax(0,1fr)]">
              <div className="flex min-h-0 flex-col border-b border-slate-200 dark:border-white/10 lg:border-b-0 lg:border-r">
                <div className="border-b border-slate-200 px-3 py-2 dark:border-white/10">
                  <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Recent TNA</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Latest records load first. Scroll for more.</p>
                </div>
                <div className="grid grid-cols-[1fr_0.8fr_7.5rem_0.9fr] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                  <span className="whitespace-nowrap">Buyer</span>
                  <span className="whitespace-nowrap">Job</span>
                  <span className="whitespace-nowrap">Date</span>
                  <span className="whitespace-nowrap">Prepared By</span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto" onScroll={handleTnaListScroll}>
                  {tnaListLoading ? (
                    <div className="flex h-40 items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Loader2 className="size-3.5 animate-spin" />
                      Loading TNA records...
                    </div>
                  ) : tnaItems.length > 0 ? (
                    <TooltipProvider delayDuration={250}>
                      <div className="divide-y divide-slate-100 dark:divide-white/10">
                      {tnaItems.map((item) => {
                        const record = item.record
                        const selected = selectedTna?.value === item.value
                        const buyerLabel = getImportBuyerLabel(record)
                        const jobLabel = getImportJobLabel(record)
                        const dateLabel = formatDate(record.created_at)
                        const preparedByLabel = getPreparedByLabel(record)

                        return (
                          <button
                            key={item.value}
                            type="button"
                            className={`grid w-full cursor-pointer grid-cols-[1fr_0.8fr_7.5rem_0.9fr] gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04] ${selected ? "bg-slate-100 ring-1 ring-inset ring-slate-300 dark:bg-white/[0.06] dark:ring-white/15" : ""}`}
                            onClick={() => void handleSelectTna(item)}
                          >
                            <ListCellTooltip className="truncate font-medium text-slate-900 dark:text-slate-100" value={buyerLabel}>{buyerLabel}</ListCellTooltip>
                            <ListCellTooltip className="truncate text-slate-700 dark:text-slate-200" value={jobLabel}>{jobLabel}</ListCellTooltip>
                            <ListCellTooltip className="whitespace-nowrap text-slate-600 dark:text-slate-300" value={dateLabel}>{dateLabel}</ListCellTooltip>
                            <ListCellTooltip className="truncate text-slate-600 dark:text-slate-300" value={preparedByLabel}>{preparedByLabel}</ListCellTooltip>
                          </button>
                        )
                      })}
                      {tnaListLoadingMore ? (
                        <div className="flex items-center justify-center gap-2 px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                          <Loader2 className="size-3.5 animate-spin" />
                          Loading more...
                        </div>
                      ) : null}
                      </div>
                    </TooltipProvider>
                  ) : (
                    <div className="flex h-40 items-center justify-center px-6 text-center text-xs text-slate-500 dark:text-slate-400">
                      No TNA records found for the selected filters.
                    </div>
                  )}
                </div>
              </div>

              <div className="min-h-0 overflow-auto p-4">
                {selectedRecord ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">TNA Preview</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Read-only source record</p>
                      </div>
                      {previewLoading ? <Loader2 className="size-4 animate-spin text-slate-400" /> : null}
                    </div>

                    <div className="grid gap-3 text-xs sm:grid-cols-2">
                      <ReadOnlyField label="Buyer" value={getImportBuyerLabel(selectedRecord)} />
                      <ReadOnlyField label="Job" value={getImportJobLabel(selectedRecord)} />
                      <ReadOnlyField label="Date" value={formatDate(selectedRecord.created_at)} />
                      <ReadOnlyField label="Prepared By" value={getPreparedByLabel(selectedRecord)} />
                      <ReadOnlyField label="Lead time" value={String(Number(selectedRecord.leadTime ?? 0))} />
                      <ReadOnlyField label="Task rows" value={String(selectedRecord.tnaDetails?.length ?? 0)} />
                    </div>

                    <div className="overflow-hidden rounded-md border border-slate-200 dark:border-white/10">
                      <table className="w-full min-w-[680px] border-collapse text-xs">
                        <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                          <tr>
                            <th className="w-12 px-2 py-2 font-semibold">#</th>
                            <th className="px-2 py-2 font-semibold">Task</th>
                            <th className="px-2 py-2 font-semibold">Execution date</th>
                            <th className="px-2 py-2 font-semibold">Days</th>
                            <th className="px-2 py-2 font-semibold">Formula</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                          {(selectedRecord.tnaDetails ?? []).map((detail, index) => (
                            <tr key={detail.id}>
                              <td className="px-2 py-2 text-slate-500 dark:text-slate-400">{index + 1}</td>
                              <td className="px-2 py-2 font-medium text-slate-900 dark:text-slate-100">{detail.task?.name?.trim() || detail.taskId}</td>
                              <td className="px-2 py-2 text-slate-700 dark:text-slate-200">{formatDate(detail.executionDate)}</td>
                              <td className="px-2 py-2 text-slate-700 dark:text-slate-200">{Number(detail.days ?? 0)}</td>
                              <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{renderImportFormula(detail.relationFormula, selectedTaskLabelsById)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-64 items-center justify-center rounded-md border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                    Select a TNA record from the left list to preview master information and detail rows.
                  </div>
                )}
              </div>
            </div>

            {importError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {importError}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button type="button" onClick={handleImportDetails} disabled={!selectedTna || importingDetails} className="rounded-xl">
              {importingDetails ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              Import details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={replaceImportConfirmOpen} onOpenChange={(nextOpen) => {
        setReplaceImportConfirmOpen(nextOpen)
        if (!nextOpen) {
          setPendingImportRows(null)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace TNA details?</AlertDialogTitle>
            <AlertDialogDescription>
              Importing these details will replace the current detail rows in this form. Buyer, job, and lead time will stay unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingImportRows) {
                  applyImportedRows(pendingImportRows)
                }
              }}
            >
              Replace details
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
