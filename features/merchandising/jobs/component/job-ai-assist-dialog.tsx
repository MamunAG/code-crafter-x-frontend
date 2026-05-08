"use client"

import { Loader2, Upload } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import type { AppComboboxOption } from "@/components/app-combobox"
import type { JobAiAssistRow } from "../job.types"

type SelectOption = AppComboboxOption

export type AiAssistMasterDataMatches = {
  styleOption: SelectOption | null
  sizeOption: SelectOption | null
  colorOption: SelectOption | null
}

export type AiAssistMissingMasterData = {
  styleNo?: string
  size?: string
  color?: string
}

export type AiAssistPendingAdd = {
  row: JobAiAssistRow
  index: number
  matches: AiAssistMasterDataMatches
  missing: AiAssistMissingMasterData
}

type JobAiAssistDialogProps = {
  open: boolean
  file: File | null
  fileName: string
  rows: JobAiAssistRow[]
  error: string
  working: boolean
  addingRowIndex: number | null
  addedRowKeys: string[]
  pendingAdd: AiAssistPendingAdd | null
  onOpenChange: (open: boolean) => void
  onFileChange: (file: File | null) => void
  onAnalyze: () => void
  onAddRow: (row: JobAiAssistRow, index: number) => void
  onGetRowKey: (row: JobAiAssistRow, index: number) => string
  onPendingAddOpenChange: (open: boolean) => void
  onConfirmCreateMasterData: () => void
}

export function JobAiAssistDialog({
  open,
  file,
  fileName,
  rows,
  error,
  working,
  addingRowIndex,
  addedRowKeys,
  pendingAdd,
  onOpenChange,
  onFileChange,
  onAnalyze,
  onAddRow,
  onGetRowKey,
  onPendingAddOpenChange,
  onConfirmCreateMasterData,
}: JobAiAssistDialogProps) {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="grid max-h-[88dvh] max-w-[calc(100vw-1.5rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-lg p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
            <DialogTitle>AI Assist</DialogTitle>
            <DialogDescription>
              Upload a PDF or Excel file. AI Assist will extract PO number,
              style, color, size, and quantity rows.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden px-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="job-ai-assist-file">File Upload</Label>
              <label
                htmlFor={working ? undefined : "job-ai-assist-file"}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-600 transition dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-300",
                  working
                    ? "cursor-not-allowed opacity-70"
                    : "cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                )}
              >
                {working ? (
                  <Loader2 className="size-5 animate-spin text-blue-500" />
                ) : (
                  <Upload className="size-5 text-slate-400" />
                )}
                <span className="max-w-full truncate font-medium">
                  {fileName || "Choose a file"}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {working
                    ? "Upload locked while AI Assist reviews this document"
                    : "PDF, XLS, XLSX, or CSV"}
                </span>
              </label>
              <Input
                id="job-ai-assist-file"
                type="file"
                accept=".pdf,.xls,.xlsx,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                disabled={working}
                className="sr-only"
                onChange={(event) =>
                  onFileChange(event.target.files?.[0] ?? null)
                }
              />
            </div>

            {working ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
                <div className="flex items-start gap-2">
                  <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
                  <div>
                    <p className="font-medium">
                      Analyzing purchase order document
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-blue-700/80 dark:text-blue-100/75">
                      Extracting PO number, style, color, size, quantity, FOB,
                      and delivery date. This may take a moment for large files.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            ) : null}

            {rows.length ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200 dark:border-white/10">
                <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  AI-generated extraction may contain mistakes. Please review
                  the original document and verify all values before saving or
                  making decisions based on this information.
                </div>
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.04]">
                  Extracted PO Detail Rows
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  <table className="w-full min-w-[700px] table-fixed border-collapse text-xs sm:text-sm">
                    <thead className="sticky top-0 z-10 bg-white dark:bg-[#17131d]">
                      <tr className="border-b border-slate-200 dark:border-white/10">
                        <th className="w-20 px-2 py-2 text-left font-medium">
                          PO Number
                        </th>
                        <th className="w-24 px-2 py-2 text-left font-medium">
                          Style No
                        </th>
                        <th className="w-20 px-2 py-2 text-left font-medium">
                          Color
                        </th>
                        <th className="w-14 px-2 py-2 text-left font-medium">
                          Size
                        </th>
                        <th className="w-16 px-2 py-2 text-right font-medium">
                          Qty
                        </th>
                        <th className="w-16 px-2 py-2 text-right font-medium">
                          FOB
                        </th>
                        <th className="w-28 px-2 py-2 text-left font-medium">
                          Delivery Date
                        </th>
                        <th className="w-20 px-2 py-2 text-right font-medium">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => {
                        const rowKey = onGetRowKey(row, index)
                        const rowAdded = addedRowKeys.includes(rowKey)
                        const rowAdding = addingRowIndex === index

                        return (
                          <tr
                            key={rowKey}
                            className="border-b border-slate-100 last:border-b-0 dark:border-white/10"
                          >
                            <td className="truncate px-2 py-2 align-top font-medium">
                              {row.poNumber || "-"}
                            </td>
                            <td className="px-2 py-2 align-top leading-5 break-words whitespace-normal">
                              {row.styleNo || "-"}
                            </td>
                            <td className="truncate px-2 py-2 align-top">
                              {row.color || "-"}
                            </td>
                            <td className="px-2 py-2 align-top">
                              {row.size || "-"}
                            </td>
                            <td className="px-2 py-2 text-right align-top font-medium">
                              {row.quantity}
                            </td>
                            <td className="px-2 py-2 text-right align-top">
                              {row.fob ?? "-"}
                            </td>
                            <td className="px-2 py-2 align-top">
                              {row.deliveryDate || "-"}
                            </td>
                            <td className="px-2 py-2 text-right align-top">
                              <Button
                                type="button"
                                size="sm"
                                variant={rowAdded ? "secondary" : "outline"}
                                className="h-7 rounded-md px-2 text-xs"
                                disabled={rowAdding || addingRowIndex !== null}
                                onClick={() => onAddRow(row, index)}
                              >
                                {rowAdding ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : null}
                                {rowAdded ? "Added" : "Add"}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            ) : null}
          </div>
          <DialogFooter className="border-t border-slate-200/70 px-4 py-3 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!file || working}
              onClick={onAnalyze}
            >
              {working ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {working
                ? "Analyzing"
                : rows.length
                  ? "Analyze Again"
                  : "Analyze"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(pendingAdd)}
        onOpenChange={onPendingAddOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add missing setup data?</AlertDialogTitle>
            <AlertDialogDescription>
              This AI Assist row contains setup values that are not available in
              the system yet. Add the missing records first, then this row will
              be inserted into PO Details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingAdd ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
              {pendingAdd.missing.styleNo ? (
                <p>
                  <span className="font-semibold">Style No:</span>{" "}
                  {pendingAdd.missing.styleNo}
                </p>
              ) : null}
              {pendingAdd.missing.color ? (
                <p>
                  <span className="font-semibold">Color:</span>{" "}
                  {pendingAdd.missing.color}
                </p>
              ) : null}
              {pendingAdd.missing.size ? (
                <p>
                  <span className="font-semibold">Size:</span>{" "}
                  {pendingAdd.missing.size}
                </p>
              ) : null}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={addingRowIndex !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={addingRowIndex !== null}
              onClick={(event) => {
                event.preventDefault()
                onConfirmCreateMasterData()
              }}
            >
              {addingRowIndex !== null ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              Add setup data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
