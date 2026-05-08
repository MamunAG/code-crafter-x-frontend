"use client"

import type { KeyboardEvent } from "react"
import { ChevronDown, ChevronUp, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import type { JobAiAssistRow } from "../job.types"
import { getAiAssistRowKey, type AiAssistFocusColumn, useJobAiAssistStore } from "./job-ai-assist.store"

type JobAiAssistDialogProps = {
  tableInputClassName: string
  onFileChange: (file: File | null) => void
  onAnalyze: () => void
  onAddRow: (row: JobAiAssistRow, index: number) => void
  onFieldKeyDown: (event: KeyboardEvent<HTMLInputElement>, rowIndex: number, column: AiAssistFocusColumn) => void
  onFillDown: () => void
  onFormatDateForInput: (value: string | null | undefined) => string
}

export function JobAiAssistDialog({
  tableInputClassName,
  onFileChange,
  onAnalyze,
  onAddRow,
  onFieldKeyDown,
  onFillDown,
  onFormatDateForInput,
}: JobAiAssistDialogProps) {
  const open = useJobAiAssistStore((state) => state.open)
  const file = useJobAiAssistStore((state) => state.file)
  const fileName = useJobAiAssistStore((state) => state.fileName)
  const uploadCollapsed = useJobAiAssistStore((state) => state.uploadCollapsed)
  const rows = useJobAiAssistStore((state) => state.rows)
  const error = useJobAiAssistStore((state) => state.error)
  const working = useJobAiAssistStore((state) => state.working)
  const addingRowIndex = useJobAiAssistStore((state) => state.addingRowIndex)
  const addedRowKeys = useJobAiAssistStore((state) => state.addedRowKeys)
  const focusedCell = useJobAiAssistStore((state) => state.focusedCell)
  const setOpen = useJobAiAssistStore((state) => state.setOpen)
  const setUploadCollapsed = useJobAiAssistStore((state) => state.setUploadCollapsed)
  const updateRow = useJobAiAssistStore((state) => state.updateRow)
  const setFocusedCell = useJobAiAssistStore((state) => state.setFocusedCell)
  const canFillDown = Boolean(focusedCell && focusedCell.rowIndex < rows.length - 1)

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="grid max-h-[92dvh] max-w-[calc(100vw-1.5rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-lg p-0 sm:max-w-6xl">
          <DialogHeader className="border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
            <DialogTitle>AI Assist</DialogTitle>
            <DialogDescription>Upload a PDF or Excel file. AI Assist will extract PO number, style no, style name, color, size, and quantity rows.</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden px-4 py-3">
            <div className="space-y-2 rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Label htmlFor="job-ai-assist-file">File Upload</Label>
                  {uploadCollapsed ? <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{fileName || "No file selected"}</p> : null}
                </div>
                {rows.length ? (
                  <Button type="button" variant="ghost" size="sm" className="h-7 rounded-sm px-2 text-xs" onClick={() => setUploadCollapsed(!uploadCollapsed)}>
                    {uploadCollapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
                    {uploadCollapsed ? "Expand" : "Minimize"}
                  </Button>
                ) : null}
              </div>
              {!uploadCollapsed ? (
                <>
                  <label
                    htmlFor={working ? undefined : "job-ai-assist-file"}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-600 transition dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-300",
                      working ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.06]",
                    )}
                  >
                    {working ? <Loader2 className="size-5 animate-spin text-blue-500" /> : <Upload className="size-5 text-slate-400" />}
                    <span className="max-w-full truncate font-medium">{fileName || "Choose a file"}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {working ? "Upload locked while AI Assist reviews this document" : "PDF, XLS, XLSX, or CSV"}
                    </span>
                  </label>
                  <Input
                    id="job-ai-assist-file"
                    type="file"
                    accept=".pdf,.xls,.xlsx,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    disabled={working}
                    className="sr-only"
                    onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                  />
                </>
              ) : null}
            </div>

            {working ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
                <div className="flex items-start gap-2">
                  <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
                  <div>
                    <p className="font-medium">Analyzing purchase order document</p>
                    <p className="mt-0.5 text-xs leading-5 text-blue-700/80 dark:text-blue-100/75">
                      Extracting PO number, style no, style name, color, size, quantity, FOB, and delivery date. This may take a moment for large files.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}

            {rows.length ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200 dark:border-white/10">
                <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  AI-generated extraction may contain mistakes. Please review the original document and verify all values before saving or making decisions based on this information.
                </div>
                <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-semibold">Extracted PO Detail Rows</span>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Enter: next row | Ctrl+Enter: previous row | Ctrl/Cmd+D: fill down</span>
                    <Button type="button" variant="outline" size="sm" className="h-7 rounded-sm px-2 text-xs" disabled={!canFillDown} onClick={onFillDown}>
                      Fill Down
                    </Button>
                  </div>
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  <table className="w-full min-w-[1120px] table-auto border-collapse text-xs sm:text-sm">
                    <thead className="sticky top-0 z-10 bg-white dark:bg-[#17131d]">
                      <tr className="border-b border-slate-200 dark:border-white/10">
                        <th className="min-w-36 px-2 py-2 text-left font-medium">PO Number</th>
                        <th className="min-w-32 px-2 py-2 text-left font-medium">Style No</th>
                        <th className="min-w-56 px-2 py-2 text-left font-medium">Style Name</th>
                        <th className="min-w-36 px-2 py-2 text-left font-medium">Color</th>
                        <th className="w-14 px-2 py-2 text-left font-medium">Size</th>
                        <th className="w-16 px-2 py-2 text-right font-medium">Qty</th>
                        <th className="w-16 px-2 py-2 text-right font-medium">FOB</th>
                        <th className="w-28 px-2 py-2 text-left font-medium">Delivery Date</th>
                        <th className="sticky right-0 w-20 bg-white px-2 py-2 text-right font-medium shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)] dark:bg-[#17131d]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => {
                        const rowKey = getAiAssistRowKey(row, index)
                        const rowAdded = addedRowKeys.includes(rowKey)
                        const rowAdding = addingRowIndex === index

                        return (
                          <tr key={`ai-assist-row-${index}`} className="border-b border-slate-100 last:border-b-0 dark:border-white/10">
                            <td className="px-2 py-2 align-top">
                              <Input value={row.poNumber} onChange={(event) => updateRow(index, { poNumber: event.target.value })} onFocus={() => setFocusedCell({ rowIndex: index, column: "poNumber" })} onKeyDown={(event) => onFieldKeyDown(event, index, "poNumber")} className={tableInputClassName} data-ai-assist-po-number={index} />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Input value={row.styleNo} onChange={(event) => updateRow(index, { styleNo: event.target.value })} onFocus={() => setFocusedCell({ rowIndex: index, column: "styleNo" })} onKeyDown={(event) => onFieldKeyDown(event, index, "styleNo")} className={tableInputClassName} data-ai-assist-style-no={index} />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Input value={row.styleName} onChange={(event) => updateRow(index, { styleName: event.target.value })} onFocus={() => setFocusedCell({ rowIndex: index, column: "styleName" })} onKeyDown={(event) => onFieldKeyDown(event, index, "styleName")} className={tableInputClassName} data-ai-assist-style-name={index} />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Input value={row.color} onChange={(event) => updateRow(index, { color: event.target.value })} onFocus={() => setFocusedCell({ rowIndex: index, column: "color" })} onKeyDown={(event) => onFieldKeyDown(event, index, "color")} className={tableInputClassName} data-ai-assist-color={index} />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Input value={row.size} onChange={(event) => updateRow(index, { size: event.target.value })} onFocus={() => setFocusedCell({ rowIndex: index, column: "size" })} onKeyDown={(event) => onFieldKeyDown(event, index, "size")} className={tableInputClassName} data-ai-assist-size={index} />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Input value={String(row.quantity ?? "")} onChange={(event) => updateRow(index, { quantity: event.target.value })} onFocus={() => setFocusedCell({ rowIndex: index, column: "quantity" })} onKeyDown={(event) => onFieldKeyDown(event, index, "quantity")} inputMode="decimal" className={cn(tableInputClassName, "text-right")} data-ai-assist-quantity={index} />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Input value={row.fob == null ? "" : String(row.fob)} onChange={(event) => updateRow(index, { fob: event.target.value })} onFocus={() => setFocusedCell({ rowIndex: index, column: "fob" })} onKeyDown={(event) => onFieldKeyDown(event, index, "fob")} inputMode="decimal" className={cn(tableInputClassName, "text-right")} data-ai-assist-fob={index} />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Input type="date" value={onFormatDateForInput(row.deliveryDate)} onChange={(event) => updateRow(index, { deliveryDate: event.target.value || null })} onFocus={() => setFocusedCell({ rowIndex: index, column: "deliveryDate" })} onKeyDown={(event) => onFieldKeyDown(event, index, "deliveryDate")} className={tableInputClassName} data-ai-assist-delivery-date={index} />
                            </td>
                            <td className="sticky right-0 bg-white px-2 py-2 text-right align-top shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)] dark:bg-[#17131d]">
                              <Button type="button" size="sm" variant={rowAdded ? "secondary" : "outline"} className="h-6 rounded-md px-3 text-xs" disabled={rowAdding || addingRowIndex !== null} onClick={() => onAddRow(row, index)}>
                                {rowAdding ? <Loader2 className="size-3 animate-spin" /> : null}
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
            <Button type="button" className="h-7 rounded-md px-3 text-xs" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" className="h-7 rounded-md px-3 text-xs" disabled={!file || working} onClick={onAnalyze}>
              {working ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {working ? "Analyzing" : rows.length ? "Analyze Again" : "Analyze"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
