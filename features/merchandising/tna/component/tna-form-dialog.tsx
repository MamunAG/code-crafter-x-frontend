"use client"

import { useEffect, useMemo, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { z } from "zod"

import { AppCombobox, type AppComboboxLoadParams, type AppComboboxLoadResult, type AppComboboxOption } from "@/components/app-combobox"
import { AppSelect } from "@/components/app-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useIsMobile } from "@/hooks/use-mobile"

import type { TnaDetailFormValues, TnaFormValues, TnaTaskRecord } from "../tna.types"

type TnaEditorMode = "create" | "edit"

type BuyerOption = AppComboboxOption
type JobOption = AppComboboxOption

type TnaFormDialogProps = {
  open: boolean
  mode: TnaEditorMode
  loading: boolean
  submitting: boolean
  error: string
  initialBuyer: BuyerOption | null
  initialJob: JobOption | null
  initialValues: TnaFormValues
  taskOptions: TnaTaskRecord[]
  taskOptionsLoading: boolean
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<BuyerOption>>
  loadJobOptions: (params: AppComboboxLoadParams, buyerId?: string) => Promise<AppComboboxLoadResult<JobOption>>
  onOpenChange: (open: boolean) => void
  onSubmit: (values: TnaFormValues) => void | Promise<void>
}

const MOBILE_MAX_SUMMARY_ERRORS = 3
const DETAIL_ROW_LIMIT = 12

const tnaFormSchema = z.object({
  buyerId: z.string().trim().min(1, "Buyer is required."),
  jobId: z.string().trim().min(1, "Job is required."),
  leadTime: z.string().trim().min(1, "Lead time is required.").refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, "Lead time must be a number greater than or equal to zero."),
  tnaDetails: z.array(
    z.object({
      id: z.string(),
      taskId: z.string().trim().min(1, "Task is required."),
      executionDate: z.string().trim().min(1, "Execution date is required."),
      days: z.string().trim().min(1, "Days are required.").refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, "Days must be a number greater than or equal to zero."),
      relationFormula: z.string().trim().min(1, "Relation formula is required."),
    }),
  ).min(1, "At least one task row is required."),
})

function emptyDetailRow(): TnaDetailFormValues {
  return {
    id: crypto.randomUUID(),
    taskId: "",
    executionDate: "",
    days: "0",
    relationFormula: "",
  }
}

function getErrorMessage(error: unknown) {
  if (typeof error === "string") return error
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string") return message
  }
  return ""
}

function detailErrorAt(errors: Record<string, unknown> | undefined, index: number, field: keyof TnaDetailFormValues) {
  const nextErrors = errors?.tnaDetails
  if (!Array.isArray(nextErrors)) return ""
  const entry = nextErrors[index] as Record<string, unknown> | undefined
  return getErrorMessage(entry?.[field])
}

function buildSummary(errors: Record<string, unknown>) {
  const summary: Array<{ label: string; message: string }> = []
  const buyerId = getErrorMessage(errors.buyerId)
  const jobId = getErrorMessage(errors.jobId)
  const leadTime = getErrorMessage(errors.leadTime)
  const detailErrors = errors.tnaDetails as Array<Record<string, unknown> | undefined> | undefined

  if (buyerId) summary.push({ label: "Buyer", message: buyerId })
  if (jobId) summary.push({ label: "Job", message: jobId })
  if (leadTime) summary.push({ label: "Lead time", message: leadTime })

  detailErrors?.forEach((detailError, index) => {
    if (!detailError) return
    const row = index + 1
    const taskId = getErrorMessage(detailError.taskId)
    const executionDate = getErrorMessage(detailError.executionDate)
    const days = getErrorMessage(detailError.days)
    const relationFormula = getErrorMessage(detailError.relationFormula)
    if (taskId) summary.push({ label: `Row ${row} task`, message: taskId })
    if (executionDate) summary.push({ label: `Row ${row} execution`, message: executionDate })
    if (days) summary.push({ label: `Row ${row} days`, message: days })
    if (relationFormula) summary.push({ label: `Row ${row} formula`, message: relationFormula })
  })

  return summary
}

export function TnaFormDialog({
  open,
  mode,
  loading,
  submitting,
  error,
  initialBuyer,
  initialJob,
  initialValues,
  taskOptions,
  taskOptionsLoading,
  loadBuyerOptions,
  loadJobOptions,
  onOpenChange,
  onSubmit,
}: TnaFormDialogProps) {
  const isMobile = useIsMobile()
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerOption | null>(initialBuyer)
  const [selectedJob, setSelectedJob] = useState<JobOption | null>(initialJob)
  const selectedBuyerId = selectedBuyer?.value?.trim() ?? ""
  const title = mode === "create" ? "Create TNA" : "Edit TNA"
  const description = mode === "create" ? "Add a TNA record with its task timeline." : "Update the selected TNA record."

  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<TnaFormValues>({
    resolver: zodResolver(tnaFormSchema),
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "tnaDetails",
  })

  useEffect(() => {
    if (!open) {
      reset(initialValues)
      setSelectedBuyer(initialBuyer)
      setSelectedJob(initialJob)
      return
    }

    reset(initialValues)
    setSelectedBuyer(initialBuyer)
    setSelectedJob(initialJob)
  }, [initialBuyer, initialJob, initialValues, open, reset])

  useEffect(() => {
    if (!selectedBuyerId) {
      setSelectedJob(null)
    }
  }, [selectedBuyerId])

  const loadBuyerScopedJobOptions = useMemo(
    () => (params: AppComboboxLoadParams) => loadJobOptions(params, selectedBuyerId || undefined),
    [loadJobOptions, selectedBuyerId],
  )

  const summary = useMemo(() => buildSummary(errors as Record<string, unknown>), [errors])
  const visibleSummary = isMobile ? summary.slice(0, MOBILE_MAX_SUMMARY_ERRORS) : summary
  const hiddenSummaryCount = summary.length - visibleSummary.length

  function handleInvalid() {
    const firstErrorField =
      errors.buyerId ? "buyerId" :
      errors.jobId ? "jobId" :
      errors.leadTime ? "leadTime" :
      null

    if (firstErrorField) {
      setFocus(firstErrorField as keyof TnaFormValues)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-4xl">
        <form
          className="flex max-h-[calc(100vh-2rem)] flex-col"
          onSubmit={handleSubmit(onSubmit, handleInvalid)}
        >
          <div className="border-b border-slate-200/70 px-6 pb-4 pt-6 dark:border-white/10">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            {!loading && error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            ) : null}

            {!loading && summary.length > 0 ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                <p className="font-medium">Please fix the following:</p>
                <ul className="mt-1 space-y-1">
                  {visibleSummary.map((entry) => (
                    <li key={`${entry.label}-${entry.message}`} className="flex gap-2">
                      <span className="shrink-0 font-medium">{entry.label}:</span>
                      <span className="min-w-0 flex-1">{entry.message}</span>
                    </li>
                  ))}
                  {hiddenSummaryCount > 0 ? <li className="font-medium">+{hiddenSummaryCount} more</li> : null}
                </ul>
              </div>
            ) : null}
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-5 px-6 py-5">
              {loading ? (
                <div className="space-y-4 py-2">
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-56 w-full rounded-2xl" />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Controller
                      name="buyerId"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <label htmlFor="tna-buyer" className="text-sm font-medium">
                            Buyer <span className="text-destructive">*</span>
                          </label>
                          <AppCombobox
                            value={selectedBuyer}
                            onValueChange={(buyer) => {
                              setSelectedBuyer(buyer)
                              field.onChange(buyer?.value ?? "")
                              setValue("jobId", "")
                              setSelectedJob(null)
                            }}
                            loadItems={loadBuyerOptions}
                            initialLimit={10}
                            searchLimit={10}
                            inputProps={{ id: "tna-buyer", "aria-invalid": Boolean(errors.buyerId) }}
                            placeholder="Search buyer"
                            loadingMessage="Loading buyers..."
                            emptyMessage="No buyers match your search."
                            showClear={Boolean(field.value)}
                            contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
                          />
                          <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">{getErrorMessage(errors.buyerId?.message)}</p>
                        </div>
                      )}
                    />

                    <Controller
                      name="jobId"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <label htmlFor="tna-job" className="text-sm font-medium">
                            Job <span className="text-destructive">*</span>
                          </label>
                          <AppCombobox
                            value={selectedJob}
                            key={selectedBuyerId || "buyer-empty"}
                            onOpenChange={(open) => {
                              if (!open && !field.value) {
                                setSelectedJob(null)
                              }
                            }}
                            onValueChange={(job) => {
                              setSelectedJob(job)
                              field.onChange(job?.value ?? "")
                            }}
                            loadItems={loadBuyerScopedJobOptions}
                            initialLimit={10}
                            searchLimit={10}
                            inputProps={{ id: "tna-job", "aria-invalid": Boolean(errors.jobId) }}
                            placeholder={selectedBuyerId ? "Search job" : "Select buyer first"}
                            loadingMessage="Loading jobs..."
                            emptyMessage={selectedBuyerId ? "No jobs match your search." : "Select a buyer to load matching jobs."}
                            showClear={Boolean(field.value)}
                            disabled={!selectedBuyerId}
                            contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
                          />
                          <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">{getErrorMessage(errors.jobId?.message)}</p>
                        </div>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="tna-leadTime" className="text-sm font-medium">
                        Lead time <span className="text-destructive">*</span>
                      </label>
                      <Input
                        id="tna-leadTime"
                        type="number"
                        min={0}
                        step="1"
                        placeholder="Input lead time"
                        aria-invalid={Boolean(errors.leadTime)}
                        {...register("leadTime")}
                      />
                      <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">{getErrorMessage(errors.leadTime?.message)}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Details</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Add timeline rows for the selected TNA task sequence.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">TNA detail rows</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Each row links a task to an execution date and formula.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => append(emptyDetailRow())}
                        disabled={fields.length >= DETAIL_ROW_LIMIT}
                      >
                        <Plus className="size-3.5" />
                        Add row
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/40"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Row {index + 1}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => remove(index)}
                              disabled={fields.length <= 1}
                            >
                              <Trash2 className="size-3.5" />
                              Remove
                            </Button>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Controller
                              name={`tnaDetails.${index}.taskId`}
                              control={control}
                              render={({ field: taskField }) => (
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Task <span className="text-destructive">*</span>
                                  </label>
                                  <AppSelect
                                    value={taskField.value}
                                    onValueChange={taskField.onChange}
                                    options={taskOptions.map((task) => ({ value: task.id, label: task.name }))}
                                    placeholder="Select task"
                                    disabled={taskOptionsLoading}
                                    triggerClassName="h-10 rounded-xl px-3 text-sm"
                                  />
                                  <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">
                                    {detailErrorAt(errors as Record<string, unknown>, index, "taskId")}
                                  </p>
                                </div>
                              )}
                            />

                            <div className="space-y-2">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Execution date <span className="text-destructive">*</span>
                              </label>
                              <Input
                                type="date"
                                className="h-10 rounded-xl"
                                aria-invalid={Boolean(detailErrorAt(errors as Record<string, unknown>, index, "executionDate"))}
                                {...register(`tnaDetails.${index}.executionDate`)}
                              />
                              <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">
                                {detailErrorAt(errors as Record<string, unknown>, index, "executionDate")}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Days <span className="text-destructive">*</span>
                              </label>
                              <Input
                                type="number"
                                min={0}
                                step="1"
                                className="h-10 rounded-xl"
                                aria-invalid={Boolean(detailErrorAt(errors as Record<string, unknown>, index, "days"))}
                                {...register(`tnaDetails.${index}.days`)}
                              />
                              <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">
                                {detailErrorAt(errors as Record<string, unknown>, index, "days")}
                              </p>
                            </div>

                            <div className="space-y-2 xl:col-span-2">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Relation formula <span className="text-destructive">*</span>
                              </label>
                              <Textarea
                                rows={2}
                                className="min-h-10 rounded-xl"
                                placeholder="lead_time - 7"
                                aria-invalid={Boolean(detailErrorAt(errors as Record<string, unknown>, index, "relationFormula"))}
                                {...register(`tnaDetails.${index}.relationFormula`)}
                              />
                              <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">
                                {detailErrorAt(errors as Record<string, unknown>, index, "relationFormula")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-slate-200/70 px-6 py-4 dark:border-white/10">
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || submitting} className="rounded-xl">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {mode === "create" ? "Save TNA" : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
