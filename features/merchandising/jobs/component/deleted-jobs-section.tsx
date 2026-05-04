"use client"

import { MoreHorizontal } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"

import type { JobRecord, PaginationMeta } from "../job.types"

type DeletedJobsSectionProps = {
  deletedJobs: JobRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeletedJobs: boolean
  deletedError: string
  onDeletedPageChange: (nextPage: number | ((current: number) => number)) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (job: JobRecord, mode: "restore" | "permanent") => void
  canRestoreJob: boolean
  canPermanentlyDeleteJob: boolean
}

function getPoLabel(job: JobRecord) {
  const values = (job.jobDetails ?? [])
    .map((detail) => detail.purchaseOrder?.pono?.trim())
    .filter((value): value is string => Boolean(value))
  return values.length ? [...new Set(values)].join(", ") : "No PO"
}

export function DeletedJobsSection({
  deletedJobs,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeletedJobs,
  deletedError,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  canRestoreJob,
  canPermanentlyDeleteJob,
}: DeletedJobsSectionProps) {
  const totalPages = deletedMeta?.totalPages ?? 1

  return (
    <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
      <CardHeader className="border-b border-slate-200/70 p-4 dark:border-white/10 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-lg">Deleted purchase orders</CardTitle>
            <CardDescription>Restore soft deleted order entries or remove them permanently.</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">Total {deletedMeta?.total ?? deletedJobs.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {deletedError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{deletedError}</div>
        ) : loadingDeletedJobs && deletedJobs.length === 0 ? (
          Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)
        ) : deletedJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-white/10">
            No deleted purchase orders found.
          </div>
        ) : (
          deletedJobs.map((job) => (
            <div key={job.id} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{getPoLabel(job)}</p>
                  <p className="mt-1 text-sm text-slate-500">Qty {Number(job.totalPoQty ?? 0)} · Details {job.jobDetails?.length ?? 0}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="rounded-xl"><MoreHorizontal className="size-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onOpenAction(job, "restore")} disabled={!canRestoreJob}>Restore</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onOpenAction(job, "permanent")} disabled={!canPermanentlyDeleteJob} className="text-destructive">Delete permanently</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200/70 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Page {deletedPage} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={deletedPage <= 1} onClick={() => onDeletedPageChange((current) => Math.max(1, current - 1))}>Previous</Button>
            <Button type="button" variant="outline" size="sm" disabled={deletedPage >= totalPages} onClick={() => onDeletedPageChange((current) => current + 1)}>Next</Button>
            <select value={String(deletedLimit)} onChange={(event) => onDeletedLimitChange(Number(event.target.value))} className="h-8 rounded-xl border border-input bg-input/20 px-3 text-xs">
              {[5, 10, 20, 50].map((item) => <option key={item} value={item}>{item} / page</option>)}
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
