"use client"

import { useMemo } from "react"

import { CalendarClock, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import type { TnaDetailRevisionFormValues, TnaDetailRevisionRecord } from "../tna.types"

export type TnaRevisionDraft = {
  newExecutionDate: string
  note: string
}

type RevisionHistoryItem = {
  id: string
  previousExecutionDate: string
  newExecutionDate: string
  note: string
  revisedAt: string
  revisedBy: string
  pending: boolean
}

type TnaRevisionDialogProps = {
  open: boolean
  taskLabel: string
  previousExecutionDate: string
  draft: TnaRevisionDraft
  savedRevisions: TnaDetailRevisionRecord[]
  pendingRevisions: TnaDetailRevisionFormValues[]
  historyLoading: boolean
  historyError: string
  revisionUnchanged: boolean
  onDraftChange: (draft: TnaRevisionDraft) => void
  onOpenChange: (open: boolean) => void
  onRetryHistory: () => void
  onSave: () => void
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return date
}

function formatDisplayDate(value?: string | null) {
  if (!value) return "-"
  const dateOnly = parseDateOnly(String(value).slice(0, 10))

  if (dateOnly) {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }).format(dateOnly)
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10) || "-"

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed)
}

function formatDisplayDateTime(value?: string | null) {
  if (!value) return "Pending save"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed)
}

function getRevisionUserLabel(record: TnaDetailRevisionRecord) {
  return record.created_by_user?.name?.trim() || record.created_by_id || "Unknown user"
}

export function TnaRevisionDialog({
  open,
  taskLabel,
  previousExecutionDate,
  draft,
  savedRevisions,
  pendingRevisions,
  historyLoading,
  historyError,
  revisionUnchanged,
  onDraftChange,
  onOpenChange,
  onRetryHistory,
  onSave,
}: TnaRevisionDialogProps) {
  const revisionHistoryItems = useMemo<RevisionHistoryItem[]>(() => {
    const pendingItems = [...pendingRevisions].reverse().map((revision, index) => ({
      id: `pending-${index}-${revision.previousExecutionDate}-${revision.newExecutionDate}`,
      previousExecutionDate: revision.previousExecutionDate,
      newExecutionDate: revision.newExecutionDate,
      note: revision.note?.trim() ?? "",
      revisedAt: "Pending save",
      revisedBy: "Pending save",
      pending: true,
    }))

    const savedItems = savedRevisions.map((revision) => ({
      id: revision.id,
      previousExecutionDate: revision.previousExecutionDate ? String(revision.previousExecutionDate).slice(0, 10) : "",
      newExecutionDate: revision.newExecutionDate ? String(revision.newExecutionDate).slice(0, 10) : "",
      note: revision.note?.trim() ?? "",
      revisedAt: formatDisplayDateTime(revision.created_at),
      revisedBy: getRevisionUserLabel(revision),
      pending: false,
    }))

    return [...pendingItems, ...savedItems]
  }, [pendingRevisions, savedRevisions])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden p-0 sm:max-w-[58rem]">
        <DialogHeader className="border-b border-slate-200/70 px-4 pb-3 pt-4 text-left dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <CalendarClock className="size-4" />
            </span>
            <div>
              <DialogTitle>Revise execution date</DialogTitle>
              <DialogDescription className="mt-1">
                Stage a date change for {taskLabel || "this task"}. It will be saved with the main TNA update.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid max-h-[calc(100vh-13rem)] min-h-0 gap-4 overflow-y-auto px-4 py-3 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:overflow-hidden">
          <div className="space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <div className="space-y-1.5">
              <label htmlFor="tna-revision-previous-date" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Previous execution date
              </label>
              <Input
                id="tna-revision-previous-date"
                type="date"
                value={previousExecutionDate}
                readOnly
                className="bg-slate-50 text-slate-600 dark:bg-white/[0.04] dark:text-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="tna-revision-new-date" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                New execution date <span className="text-destructive">*</span>
              </label>
              <Input
                id="tna-revision-new-date"
                type="date"
                value={draft.newExecutionDate}
                onChange={(event) => onDraftChange({ ...draft, newExecutionDate: event.target.value })}
              />
              {revisionUnchanged ? (
                <p className="text-[11px] leading-4 text-amber-700 dark:text-amber-200">
                  Choose a different date to create a revision record.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="tna-revision-note" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Note
              </label>
              <Textarea
                id="tna-revision-note"
                value={draft.note}
                onChange={(event) => onDraftChange({ ...draft, note: event.target.value })}
                placeholder="Why did this task date change?"
                className="min-h-40 lg:min-h-56"
              />
              <p className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                Notes are optional, but useful when this task is revised more than once.
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-3 py-2 dark:border-white/10">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Revision history</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Newest changes appear first.</p>
              </div>
              {historyLoading ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[10px] font-medium text-slate-500 shadow-sm dark:bg-slate-950/60 dark:text-slate-300">
                  <Loader2 className="size-3 animate-spin" />
                  Loading
                </span>
              ) : null}
            </div>

            {historyError ? (
              <div className="m-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-4 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>{historyError}</span>
                  <Button type="button" variant="outline" size="sm" className="h-7 rounded-lg px-2 text-[11px]" onClick={onRetryHistory}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : null}

            {!historyLoading && !historyError && revisionHistoryItems.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-slate-500 dark:text-slate-400">
                No revision history yet.
              </div>
            ) : null}

            {revisionHistoryItems.length > 0 ? (
              <div className="max-h-64 overflow-y-auto p-3 lg:max-h-none lg:min-h-0 lg:flex-1">
                <div className="space-y-2">
                  {revisionHistoryItems.map((revision) => (
                    <div key={revision.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-white/10 dark:bg-slate-950/50">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {revision.pending ? "Pending save" : revision.revisedAt}
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${revision.pending ? "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-100" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-100"}`}>
                          {revision.pending ? "Pending save" : "Saved"}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-2 min-[420px]:grid-cols-2">
                        <div className="rounded-md bg-slate-50 px-2 py-1.5 dark:bg-white/[0.04]">
                          <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">Previous</p>
                          <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">{formatDisplayDate(revision.previousExecutionDate)}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 px-2 py-1.5 dark:bg-white/[0.04]">
                          <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">New</p>
                          <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">{formatDisplayDate(revision.newExecutionDate)}</p>
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] leading-4 text-slate-600 dark:text-slate-300">
                        <span className="font-medium text-slate-700 dark:text-slate-200">Note:</span>{" "}
                        {revision.note || "No note added."}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        Revised by {revision.pending ? "current user after save" : revision.revisedBy}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={!draft.newExecutionDate.trim() || revisionUnchanged}
            onClick={onSave}
          >
            Stage revision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
