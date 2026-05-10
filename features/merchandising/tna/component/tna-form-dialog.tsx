"use client"

import { useEffect, useMemo, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react"
import type { DragEvent } from "react"
import { z } from "zod"

import { AppCombobox, type AppComboboxLoadParams, type AppComboboxLoadResult, type AppComboboxOption } from "@/components/app-combobox"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"

import type { TnaDetailFormValues, TnaFormValues, TnaTaskRecord } from "../tna.types"

type TnaEditorMode = "create" | "edit"

type BuyerOption = AppComboboxOption
type JobOption = AppComboboxOption
type TaskOption = AppComboboxOption
type TnaDetailTableRow = TnaDetailFormValues

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
  onNewTask?: () => void
  onSubmit: (values: TnaFormValues) => void | Promise<void>
}

const MOBILE_MAX_SUMMARY_ERRORS = 3
const DETAIL_TABLE_INPUT_CLASS = "h-8 rounded-md px-2 text-xs"

function DetailTableError({ message }: { message: string }) {
  if (!message) return null
  return <p className="pt-1 text-[10px] leading-3 text-red-600 dark:text-red-300">{message}</p>
}

function getDetailHeaderClass(columnId: string) {
  const baseClass = "px-1.5 py-2 text-left font-medium whitespace-nowrap text-foreground"

  if (columnId === "position") return `w-12 ${baseClass}`
  if (columnId === "taskId") return `min-w-56 ${baseClass}`
  if (columnId === "executionDate") return `min-w-40 ${baseClass}`
  if (columnId === "days") return `w-28 ${baseClass}`
  if (columnId === "relationFormula") return `min-w-64 ${baseClass}`
  if (columnId === "actions") return `w-16 ${baseClass} text-right`

  return baseClass
}

function getDetailCellClass(columnId: string) {
  if (columnId === "position") return "px-1.5 py-1 align-middle text-xs whitespace-nowrap"
  if (columnId === "taskId") return "min-w-56 px-1.5 py-1 align-top"
  if (columnId === "executionDate") return "min-w-40 px-1.5 py-1 align-top"
  if (columnId === "days") return "w-28 px-1.5 py-1 align-top"
  if (columnId === "relationFormula") return "min-w-64 px-1.5 py-1 align-top"
  if (columnId === "actions") return "px-1.5 py-1 text-right align-middle"

  return "px-1.5 py-1 align-top"
}

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
      relationFormula: z.string().trim(),
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
  onNewTask,
  onSubmit,
}: TnaFormDialogProps) {
  const isMobile = useIsMobile()
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerOption | null>(initialBuyer)
  const [selectedJob, setSelectedJob] = useState<JobOption | null>(initialJob)
  const [jobOptions, setJobOptions] = useState<JobOption[]>(initialJob ? [initialJob] : [])
  const [jobOptionsLoading, setJobOptionsLoading] = useState(false)
  const [jobOptionsError, setJobOptionsError] = useState("")
  const [jobOpen, setJobOpen] = useState(false)
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

  const [draggingDetailId, setDraggingDetailId] = useState("")

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "tnaDetails",
  })

  useEffect(() => {
    if (!open) {
      reset(initialValues)
      setSelectedBuyer(initialBuyer)
      setSelectedJob(initialJob)
      setJobOptions(initialJob ? [initialJob] : [])
      setJobOpen(false)
      return
    }

    reset(initialValues)
    setSelectedBuyer(initialBuyer)
    setSelectedJob(initialJob)
    setJobOptions(initialJob ? [initialJob] : [])
    setJobOpen(false)
  }, [initialBuyer, initialJob, initialValues, open, reset])

  useEffect(() => {
    if (!selectedBuyerId) {
      setSelectedJob(null)
      setJobOptions([])
      setJobOpen(false)
    }
  }, [selectedBuyerId])

  useEffect(() => {
    if (!open || !selectedBuyerId) {
      return
    }

    let active = true

    async function loadBuyerJobs() {
      setJobOptionsLoading(true)
      setJobOptionsError("")

      try {
        const result = await loadJobOptions({ query: "", page: 1, limit: 100 }, selectedBuyerId)
        const nextItems = Array.isArray(result) ? result : result.items

        if (active) {
          setJobOptions(nextItems)
        }
      } catch (caughtError) {
        if (active) {
          setJobOptions([])
          setJobOptionsError(caughtError instanceof Error ? caughtError.message : "Unable to load jobs for the selected buyer.")
        }
      } finally {
        if (active) {
          setJobOptionsLoading(false)
        }
      }
    }

    void loadBuyerJobs()

    return () => {
      active = false
    }
  }, [loadJobOptions, open, selectedBuyerId])

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

  function reorderDetail(sourceId: string, targetId: string) {
    if (!sourceId || sourceId === targetId) {
      return
    }

    const sourceIndex = fields.findIndex((field) => field.id === sourceId)
    const targetIndex = fields.findIndex((field) => field.id === targetId)

    if (sourceIndex < 0 || targetIndex < 0) {
      return
    }

    move(sourceIndex, targetIndex)
  }

  function handleDetailDragStart(event: DragEvent<HTMLElement>, detailId: string) {
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", detailId)
    setDraggingDetailId(detailId)
  }

  function handleDetailDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }

  function handleDetailDrop(event: DragEvent<HTMLElement>, targetId: string) {
    event.preventDefault()
    reorderDetail(event.dataTransfer.getData("text/plain") || draggingDetailId, targetId)
    setDraggingDetailId("")
  }

  const taskComboboxOptions = useMemo<TaskOption[]>(
    () => taskOptions.map((task) => ({ value: task.id, label: task.name })),
    [taskOptions],
  )

  const detailColumns = useMemo<ColumnDef<TnaDetailTableRow>[]>(
    () => [
      {
        id: "position",
        header: "#",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              draggable
              onDragStart={(event) => handleDetailDragStart(event, row.original.id)}
              onDragEnd={() => setDraggingDetailId("")}
              className="flex size-6 cursor-grab items-center justify-center rounded-md text-slate-400 hover:bg-slate-900/5 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
              aria-label={`Drag row ${row.index + 1}`}
            >
              <GripVertical className="size-3.5" />
            </button>
            <span>{row.index + 1}</span>
          </div>
        ),
      },
      {
        id: "taskId",
        header: () => <>Task <span className="text-destructive">*</span></>,
        cell: ({ row }) => (
          <Controller
            name={`tnaDetails.${row.index}.taskId`}
            control={control}
            render={({ field: taskField }) => (
              <div className="space-y-1">
                <AppCombobox
                  value={taskComboboxOptions.find((task) => task.value === taskField.value) ?? null}
                  onValueChange={(task) => taskField.onChange(task?.value ?? "")}
                  items={taskComboboxOptions}
                  placeholder="Select task"
                  loadingMessage="Loading tasks..."
                  emptyMessage="No tasks match your search."
                  disabled={taskOptionsLoading}
                  showClear={Boolean(taskField.value)}
                  inputClassName={DETAIL_TABLE_INPUT_CLASS}
                  contentClassName="overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
                />
                <DetailTableError message={detailErrorAt(errors as Record<string, unknown>, row.index, "taskId")} />
              </div>
            )}
          />
        ),
      },
      {
        id: "executionDate",
        header: () => <>Execution date <span className="text-destructive">*</span></>,
        cell: ({ row }) => (
          <div className="space-y-1">
            <Input
              type="date"
              className={DETAIL_TABLE_INPUT_CLASS}
              aria-invalid={Boolean(detailErrorAt(errors as Record<string, unknown>, row.index, "executionDate"))}
              {...register(`tnaDetails.${row.index}.executionDate`)}
            />
            <DetailTableError message={detailErrorAt(errors as Record<string, unknown>, row.index, "executionDate")} />
          </div>
        ),
      },
      {
        id: "days",
        header: () => <>Days <span className="text-destructive">*</span></>,
        cell: ({ row }) => (
          <div className="space-y-1">
            <Input
              type="number"
              min={0}
              step="1"
              className={DETAIL_TABLE_INPUT_CLASS}
              aria-invalid={Boolean(detailErrorAt(errors as Record<string, unknown>, row.index, "days"))}
              {...register(`tnaDetails.${row.index}.days`)}
            />
            <DetailTableError message={detailErrorAt(errors as Record<string, unknown>, row.index, "days")} />
          </div>
        ),
      },
      {
        id: "relationFormula",
        header: "Relation formula",
        cell: ({ row }) => (
          <div className="space-y-1">
            <Input
              className={DETAIL_TABLE_INPUT_CLASS}
              placeholder="lead_time - 7"
              aria-invalid={Boolean(detailErrorAt(errors as Record<string, unknown>, row.index, "relationFormula"))}
              {...register(`tnaDetails.${row.index}.relationFormula`)}
            />
            <DetailTableError message={detailErrorAt(errors as Record<string, unknown>, row.index, "relationFormula")} />
          </div>
        ),
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 rounded-md text-destructive hover:text-destructive"
            onClick={() => remove(row.index)}
            disabled={fields.length <= 1}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ),
      },
    ],
    [control, errors, fields.length, register, remove, taskComboboxOptions, taskOptionsLoading],
  )

  const detailTable = useReactTable({
    data: fields,
    columns: detailColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] translate-x-0 translate-y-0 overflow-hidden rounded-none p-0 sm:left-1/2 sm:top-1/2 sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
        <form
          className="flex h-full max-h-[100dvh] flex-col sm:max-h-[calc(100vh-2rem)]"
          onSubmit={handleSubmit(onSubmit, handleInvalid)}
        >
          <div className="border-b border-slate-200/70 px-4 pb-4 pt-5 sm:px-6 sm:pt-6 dark:border-white/10">
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

          <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
            <div className="flex min-h-full flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5 lg:h-full lg:min-h-0">
              {loading ? (
                <div className="space-y-4 py-2">
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-5">
                  <div className="grid gap-4 md:grid-cols-3">
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
                            open={jobOpen}
                            items={jobOptions}
                            onOpenChange={(open) => {
                              setJobOpen(open)
                              if (!open && !field.value) {
                                setSelectedJob(null)
                              }
                            }}
                            onValueChange={(job) => {
                              setSelectedJob(job)
                              field.onChange(job?.value ?? "")
                              setJobOpen(false)
                            }}
                            inputProps={{ id: "tna-job", "aria-invalid": Boolean(errors.jobId) }}
                            placeholder={selectedBuyerId ? "Search job" : "Select buyer first"}
                            loading={jobOptionsLoading}
                            loadingMessage="Loading jobs..."
                            emptyMessage={jobOptionsError || (selectedBuyerId ? "No jobs match your search." : "Select a buyer to load matching jobs.")}
                            showClear={Boolean(field.value)}
                            disabled={!selectedBuyerId}
                            contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
                          />
                          <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">{getErrorMessage(errors.jobId?.message)}</p>
                        </div>
                      )}
                    />
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
                    </div>
                  </div>



                  <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 sm:p-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="sticky top-0 z-30 -mx-3 -mt-3 flex flex-col gap-3 border-b border-slate-200/70 bg-slate-50/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:-mt-4 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-white/10 dark:bg-slate-950/95">
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">TNA detail rows</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Each row links a task to an execution date and formula.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        {onNewTask ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full rounded-xl sm:w-auto"
                            onClick={onNewTask}
                          >
                            <Plus className="size-3.5" />
                            New Task
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full rounded-xl sm:w-auto"
                          onClick={() => append(emptyDetailRow())}
                        >
                          <Plus className="size-3.5" />
                          Add row
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 lg:hidden">
                        {fields.map((field, index) => (
                          <div
                            key={field.id}
                            onDragOver={handleDetailDragOver}
                            onDrop={(event) => handleDetailDrop(event, field.id)}
                            className={`rounded-lg border border-slate-200 bg-white p-3 transition-opacity dark:border-white/10 dark:bg-slate-950/40 ${draggingDetailId === field.id ? "opacity-60" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  draggable
                                  onDragStart={(event) => handleDetailDragStart(event, field.id)}
                                  onDragEnd={() => setDraggingDetailId("")}
                                  className="flex size-7 cursor-grab items-center justify-center rounded-md text-slate-400 hover:bg-slate-900/5 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
                                  aria-label={`Drag row ${index + 1}`}
                                >
                                  <GripVertical className="size-3.5" />
                                </button>
                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Row {index + 1}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 rounded-md text-destructive hover:text-destructive"
                                onClick={() => remove(index)}
                                disabled={fields.length <= 1}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>

                            <div className="mt-3 space-y-3">
                              <Controller
                                name={`tnaDetails.${index}.taskId`}
                                control={control}
                                render={({ field: taskField }) => (
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                      Task <span className="text-destructive">*</span>
                                    </label>
                                    <AppCombobox
                                      value={taskComboboxOptions.find((task) => task.value === taskField.value) ?? null}
                                      onValueChange={(task) => taskField.onChange(task?.value ?? "")}
                                      items={taskComboboxOptions}
                                      placeholder="Select task"
                                      loadingMessage="Loading tasks..."
                                      emptyMessage="No tasks match your search."
                                      disabled={taskOptionsLoading}
                                      showClear={Boolean(taskField.value)}
                                      inputClassName="h-9 rounded-md px-2 text-xs"
                                      contentClassName="overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
                                    />
                                    <p className="min-h-4 text-[10px] leading-4 text-red-600 dark:text-red-300">
                                      {detailErrorAt(errors as Record<string, unknown>, index, "taskId")}
                                    </p>
                                  </div>
                                )}
                              />

                              <div className="grid gap-3 min-[420px]:grid-cols-2">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Execution date <span className="text-destructive">*</span>
                                  </label>
                                  <Input
                                    type="date"
                                    className="h-9 rounded-md px-2 text-xs"
                                    aria-invalid={Boolean(detailErrorAt(errors as Record<string, unknown>, index, "executionDate"))}
                                    {...register(`tnaDetails.${index}.executionDate`)}
                                  />
                                  <p className="min-h-4 text-[10px] leading-4 text-red-600 dark:text-red-300">
                                    {detailErrorAt(errors as Record<string, unknown>, index, "executionDate")}
                                  </p>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Days <span className="text-destructive">*</span>
                                  </label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step="1"
                                    className="h-9 rounded-md px-2 text-xs"
                                    aria-invalid={Boolean(detailErrorAt(errors as Record<string, unknown>, index, "days"))}
                                    {...register(`tnaDetails.${index}.days`)}
                                  />
                                  <p className="min-h-4 text-[10px] leading-4 text-red-600 dark:text-red-300">
                                    {detailErrorAt(errors as Record<string, unknown>, index, "days")}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                  Relation formula
                                </label>
                                <Input
                                  className="h-9 rounded-md px-2 text-xs"
                                  placeholder="lead_time - 7"
                                  aria-invalid={Boolean(detailErrorAt(errors as Record<string, unknown>, index, "relationFormula"))}
                                  {...register(`tnaDetails.${index}.relationFormula`)}
                                />
                                <p className="min-h-4 text-[10px] leading-4 text-red-600 dark:text-red-300">
                                  {detailErrorAt(errors as Record<string, unknown>, index, "relationFormula")}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                    <div className="hidden w-full max-w-full min-w-0 overflow-auto overscroll-contain rounded-md border border-slate-200/70 bg-white pb-2 [scrollbar-gutter:stable] lg:block lg:min-h-0 lg:flex-1 dark:border-white/10 dark:bg-slate-950/40">
                      <table className="w-full min-w-[920px] border-collapse text-xs">
                        <thead>
                          {detailTable.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="h-9 border-b hover:bg-transparent">
                              {headerGroup.headers.map((header) => (
                                <th key={header.id} className={`${getDetailHeaderClass(header.column.id)} sticky top-0 z-20 bg-white shadow-[inset_0_-1px_0_rgba(226,232,240,0.9)] dark:bg-slate-950`}>
                                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                </th>
                              ))}
                            </tr>
                          ))}
                        </thead>
                        <tbody>
                          {detailTable.getRowModel().rows.map((row) => (
                            <tr
                              key={row.id}
                              onDragOver={handleDetailDragOver}
                              onDrop={(event) => handleDetailDrop(event, row.original.id)}
                              className={`h-10 border-b align-top transition-colors hover:bg-muted/50 ${draggingDetailId === row.original.id ? "opacity-60" : ""}`}
                            >
                              {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} className={getDetailCellClass(cell.column.id)}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200/70 px-4 py-4 sm:px-6 dark:border-white/10">
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
