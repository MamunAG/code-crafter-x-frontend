"use client"

import { useCallback, useState } from "react"

import { Download, Loader2 } from "lucide-react"

import { AppCombobox, type AppComboboxLoadParams, type AppComboboxLoadResult, type AppComboboxOption } from "@/components/app-combobox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import type { TnaDetailFormValues, TnaRecord } from "../tna.types"

type BuyerOption = AppComboboxOption
type JobOption = AppComboboxOption

export type ImportTnaOption = AppComboboxOption & { record: TnaRecord }

export type LoadImportTnaOptionsParams = AppComboboxLoadParams & {
  buyerId: string
  jobId: string
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
  const [importTna, setImportTna] = useState<ImportTnaOption | null>(null)
  const [importError, setImportError] = useState("")
  const [importingDetails, setImportingDetails] = useState(false)
  const [pendingImportRows, setPendingImportRows] = useState<TnaDetailFormValues[] | null>(null)
  const [replaceImportConfirmOpen, setReplaceImportConfirmOpen] = useState(false)
  const importBuyerId = importBuyer?.value?.trim() ?? ""
  const importJobId = importJob?.value?.trim() ?? ""

  const resetImportState = useCallback(() => {
    setImportBuyer(null)
    setImportJob(null)
    setImportTna(null)
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

  async function handleImportDetails() {
    if (!importTna?.value || importingDetails) return

    setImportingDetails(true)
    setImportError("")

    try {
      const record = await loadImportTnaRecord(importTna.value)
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

  const loadImportTnas = useCallback((params: AppComboboxLoadParams) => {
    if (!importBuyerId || !importJobId) {
      return Promise.resolve({ items: [], hasNextPage: false })
    }

    return loadImportTnaOptions({
      ...params,
      buyerId: importBuyerId,
      jobId: importJobId,
    }).then((result) => {
      if (!currentTnaId) return result

      if (Array.isArray(result)) {
        return result.filter((item) => item.value !== currentTnaId)
      }

      return {
        ...result,
        items: result.items.filter((item) => item.value !== currentTnaId),
      }
    })
  }, [currentTnaId, importBuyerId, importJobId, loadImportTnaOptions])

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import TNA Details</DialogTitle>
            <DialogDescription>Select a source TNA and import its detail rows into this form.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buyer</label>
                <AppCombobox
                  value={importBuyer}
                  onValueChange={(buyer) => {
                    setImportBuyer(buyer)
                    setImportJob(null)
                    setImportTna(null)
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Job</label>
                <AppCombobox
                  key={importBuyerId || "import-buyer-empty"}
                  value={importJob}
                  onValueChange={(job) => {
                    setImportJob(job)
                    setImportTna(null)
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Source TNA</label>
              <AppCombobox
                key={`${importBuyerId || "buyer-empty"}-${importJobId || "job-empty"}`}
                value={importTna}
                onValueChange={(tna) => {
                  setImportTna(tna)
                  setImportError("")
                }}
                loadItems={loadImportTnas}
                initialLimit={10}
                searchLimit={10}
                placeholder={importJobId ? "Select source TNA" : "Select buyer and job first"}
                loadingMessage="Loading TNA records..."
                emptyMessage={importJobId ? "No TNA records found for this buyer and job." : "Select a buyer and job to load TNA records."}
                showClear={Boolean(importTna)}
                disabled={!importBuyerId || !importJobId}
                contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
                renderItem={(item) => (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {getImportBuyerLabel(item.record)} / {getImportJobLabel(item.record)} / {item.record.tnaDetails?.length ?? 0} row{(item.record.tnaDetails?.length ?? 0) === 1 ? "" : "s"}
                    </p>
                  </div>
                )}
              />
            </div>

            {importTna ? (
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 sm:grid-cols-2">
                <p><span className="font-medium">Buyer:</span> {getImportBuyerLabel(importTna.record)}</p>
                <p><span className="font-medium">Job:</span> {getImportJobLabel(importTna.record)}</p>
                <p><span className="font-medium">Lead time:</span> {Number(importTna.record.leadTime ?? 0)}</p>
                <p><span className="font-medium">Task rows:</span> {importTna.record.tnaDetails?.length ?? 0}</p>
              </div>
            ) : null}

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
            <Button type="button" onClick={handleImportDetails} disabled={!importTna || importingDetails} className="rounded-xl">
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
