"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { Controller, useFieldArray, useForm, useFormState, useWatch } from "react-hook-form"
import { ArrowDownNarrowWide, CalendarClock, CalendarIcon, Download, GripVertical, Loader2, Plus, Trash2, X } from "lucide-react"
import type { DragEvent } from "react"
import { z } from "zod"

import { AppCombobox, type AppComboboxLoadParams, type AppComboboxLoadResult, type AppComboboxOption } from "@/components/app-combobox"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"

import { createTaskFormulaToken, evaluateTnaRelationFormula, renderTnaRelationFormula } from "../tna-formula.utils"
import type { TnaDetailFormValues, TnaDetailRevisionRecord, TnaFormValues, TnaRecord, TnaTaskRecord } from "../tna.types"
import { TnaFormulaDialog } from "./tna-formula-dialog"
import { TnaImportDialog, type ImportTnaOption, type LoadImportTnaOptionsParams } from "./tna-import-dialog"
import { TnaRevisionDialog, type TnaRevisionDraft } from "./tna-revision-dialog"

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
  currentTnaId?: string | null
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<BuyerOption>>
  loadJobOptions: (params: AppComboboxLoadParams, buyerId?: string) => Promise<AppComboboxLoadResult<JobOption>>
  loadImportTnaOptions: (params: LoadImportTnaOptionsParams) => Promise<AppComboboxLoadResult<ImportTnaOption>>
  loadImportTnaRecord: (id: string) => Promise<TnaRecord>
  loadDetailRevisions: (tnaId: string, detailId: string) => Promise<TnaDetailRevisionRecord[]>
  onOpenChange: (open: boolean) => void
  onNewTask?: () => void
  onSubmit: (values: TnaFormValues) => void | Promise<void>
}

type FormulaButtonCellProps = {
  className?: string
  control: ReturnType<typeof useForm<TnaFormValues>>["control"]
  index: number
  renderFormulaLabel: (formula: string) => string
  onClearFormula: (index: number) => void
  onOpenFormula: (index: number) => void
}

type DetailTableFieldErrorProps = {
  control: ReturnType<typeof useForm<TnaFormValues>>["control"]
  index: number
  field: keyof TnaDetailFormValues
}

type DaysInputCellProps = {
  ariaInvalid?: boolean
  className: string
  control: ReturnType<typeof useForm<TnaFormValues>>["control"]
  disabled?: boolean
  index: number
  register: ReturnType<typeof useForm<TnaFormValues>>["register"]
  onValueChange?: (value: string) => void
}

type ExecutionDateInputCellProps = {
  ariaInvalid?: boolean
  className: string
  control: ReturnType<typeof useForm<TnaFormValues>>["control"]
  disabled?: boolean
  index: number
  register: ReturnType<typeof useForm<TnaFormValues>>["register"]
  onValueChange?: (value: string) => void
}

type LeadTimeWarning = {
  leadTime: number
  overBy: number
  planDays: number
}

const MOBILE_MAX_SUMMARY_ERRORS = 3
const DETAIL_TABLE_INPUT_CLASS = "h-7 rounded-md px-1.5 text-[11px]"
const EXCEEDING_DAYS_INPUT_CLASS = "border-amber-400 bg-amber-50 font-semibold text-amber-900 shadow-[0_0_0_1px_rgba(245,158,11,0.18)] dark:border-amber-400/60 dark:bg-amber-500/10 dark:text-amber-100"

function FormulaButtonCell({ className = "h-7", control, index, renderFormulaLabel, onClearFormula, onOpenFormula }: FormulaButtonCellProps) {
  const formula = useWatch({ control, name: `tnaDetails.${index}.relationFormula` }) ?? ""
  const hasFormula = Boolean(formula.trim())
  const stateClassName = hasFormula
    ? "border-emerald-200 bg-emerald-50 font-medium text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-100"
    : "border-dashed border-slate-300 bg-transparent text-slate-400 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:border-white/15 dark:text-slate-500 dark:hover:border-white/25 dark:hover:bg-white/[0.04] dark:hover:text-slate-300"

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className={`${className} w-full justify-start rounded-md py-0 pl-2 pr-8 text-left text-[11px] ${stateClassName}`}
        onClick={() => onOpenFormula(index)}
      >
        <span className="truncate">
          {renderFormulaLabel(formula)}
        </span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 size-5 -translate-y-1/2 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-0 dark:hover:bg-red-500/10 dark:hover:text-red-300"
        disabled={!hasFormula}
        onClick={() => onClearFormula(index)}
        aria-label={`Clear formula for row ${index + 1}`}
        title="Clear formula"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}

function DaysInputCell({ ariaInvalid = false, className, control, disabled = false, index, register, onValueChange }: DaysInputCellProps) {
  const formula = useWatch({ control, name: `tnaDetails.${index}.relationFormula` }) ?? ""
  const days = useWatch({ control, name: `tnaDetails.${index}.days` }) ?? ""
  const leadTime = useWatch({ control, name: "leadTime" }) ?? ""
  const daysNumber = getFiniteNumber(days)
  const leadTimeNumber = getFiniteNumber(leadTime)
  const hasFormula = Boolean(formula.trim())
  const exceedsLeadTime = daysNumber !== null && leadTimeNumber !== null && daysNumber > leadTimeNumber
  const overBy = daysNumber !== null && leadTimeNumber !== null ? daysNumber - leadTimeNumber : 0
  const daysField = register(`tnaDetails.${index}.days`)
  const disabledTitle = hasFormula
    ? "This row is controlled by a formula."
    : disabled
      ? "Use Revise to change the execution date for this saved row."
      : ""

  return (
    <Input
      type="number"
      min={0}
      step="1"
      disabled={hasFormula || disabled}
      title={disabledTitle || (exceedsLeadTime ? `This row is ${overBy} day(s) over lead time.` : "Used when applying Set start date")}
      className={`${className} ${exceedsLeadTime ? EXCEEDING_DAYS_INPUT_CLASS : ""}`}
      aria-invalid={ariaInvalid}
      {...daysField}
      onChange={(event) => {
        daysField.onChange(event)
        onValueChange?.(event.target.value)
      }}
    />
  )
}

function ExecutionDateInputCell({ ariaInvalid = false, className, control, disabled = false, index, register, onValueChange }: ExecutionDateInputCellProps) {
  const formula = useWatch({ control, name: `tnaDetails.${index}.relationFormula` }) ?? ""
  const hasFormula = Boolean(formula.trim())
  const executionDateField = register(`tnaDetails.${index}.executionDate`)
  const disabledTitle = hasFormula
    ? "This row is controlled by a formula."
    : disabled
      ? "Use Revise to change the execution date for this saved row."
      : undefined

  return (
    <Input
      type="date"
      className={className}
      disabled={hasFormula || disabled}
      title={disabledTitle}
      aria-invalid={ariaInvalid}
      {...executionDateField}
      onChange={(event) => {
        executionDateField.onChange(event)
        onValueChange?.(event.target.value)
      }}
    />
  )
}

function DetailTableError({ message }: { message: string }) {
  if (!message) return null
  return <p className="pt-0.5 text-[10px] leading-3 text-red-600 dark:text-red-300">{message}</p>
}

function DetailTableFieldError({ control, index, field }: DetailTableFieldErrorProps) {
  const { errors } = useFormState({
    control,
    name: `tnaDetails.${index}.${field}`,
  })

  return <DetailTableError message={detailErrorAt(errors as Record<string, unknown>, index, field)} />
}

function getDetailHeaderClass(columnId: string) {
  const baseClass = "px-1.5 py-1 text-left font-medium whitespace-nowrap text-foreground"

  if (columnId === "position") return `w-12 ${baseClass}`
  if (columnId === "taskId") return `min-w-56 ${baseClass}`
  if (columnId === "executionDate") return `min-w-40 ${baseClass}`
  if (columnId === "days") return `w-28 ${baseClass}`
  if (columnId === "relationFormula") return `min-w-64 ${baseClass}`
  if (columnId === "actions") return `w-20 ${baseClass} text-right`

  return baseClass
}

function getDetailCellClass(columnId: string) {
  if (columnId === "position") return "px-1.5 py-0.5 align-middle text-xs whitespace-nowrap"
  if (columnId === "taskId") return "min-w-56 px-1.5 py-0.5 align-middle"
  if (columnId === "executionDate") return "min-w-40 px-1.5 py-0.5 align-middle"
  if (columnId === "days") return "w-28 px-1.5 py-0.5 align-middle"
  if (columnId === "relationFormula") return "min-w-64 px-1.5 py-0.5 align-middle"
  if (columnId === "actions") return "px-1.5 py-0.5 text-right align-middle"

  return "px-1.5 py-0.5 align-middle"
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
      sortOrder: z.number().optional(),
      relationFormula: z.string().trim(),
      isPersisted: z.boolean().optional(),
      revisions: z.array(
        z.object({
          previousExecutionDate: z.string().trim().min(1),
          newExecutionDate: z.string().trim().min(1),
          note: z.string().optional(),
        }),
      ).optional(),
    }),
  ).min(1, "At least one task row is required."),
})

function emptyDetailRow(): TnaDetailFormValues {
  return {
    id: crypto.randomUUID(),
    taskId: "",
    executionDate: "",
    days: "1",
    relationFormula: "",
    isPersisted: false,
    revisions: [],
  }
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

function parseCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return undefined

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined
  }

  return date
}

function getFiniteNumber(value: string) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  const numberValue = Number(trimmedValue)
  return Number.isFinite(numberValue) ? numberValue : null
}

function getDateSortValue(value: string) {
  return parseDateOnly(value)?.getTime() ?? null
}

function formatDateOnly(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatCalendarDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDaysToDateOnly(startDateValue: string, daysToAdd: number) {
  const startDate = parseDateOnly(startDateValue)
  if (!startDate || !Number.isInteger(daysToAdd)) return null

  const nextDate = new Date(startDate.getTime())
  nextDate.setUTCDate(nextDate.getUTCDate() + daysToAdd)
  return formatDateOnly(nextDate)
}

function getPlanDayNumber(startDateValue: string, executionDateValue: string) {
  const startDate = parseDateOnly(startDateValue)
  const executionDate = parseDateOnly(executionDateValue)
  if (!startDate || !executionDate) return null

  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((executionDate.getTime() - startDate.getTime()) / msPerDay) + 1
}

function getPositiveInteger(value: string) {
  const numberValue = getFiniteNumber(value)
  return numberValue !== null && Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null
}

function getLeadTimeWarning(details: TnaDetailFormValues[], leadTimeValue: string): LeadTimeWarning | null {
  const leadTime = getFiniteNumber(leadTimeValue)
  if (leadTime === null || leadTime < 0) return null

  const planDays = details.reduce((maxDays, detail) => {
    const days = getFiniteNumber(detail.days)
    return days === null ? maxDays : Math.max(maxDays, days)
  }, 0)

  if (planDays <= leadTime) return null

  return {
    leadTime,
    overBy: planDays - leadTime,
    planDays,
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
  currentTnaId,
  loadBuyerOptions,
  loadJobOptions,
  loadImportTnaOptions,
  loadImportTnaRecord,
  loadDetailRevisions,
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
  const [formulaDialogOpen, setFormulaDialogOpen] = useState(false)
  const [formulaDetailIndex, setFormulaDetailIndex] = useState<number | null>(null)
  const [formulaInitialValue, setFormulaInitialValue] = useState("")
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [startDateDialogOpen, setStartDateDialogOpen] = useState(false)
  const [pendingStartDate, setPendingStartDate] = useState<Date | undefined>(undefined)
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false)
  const [revisionDetailIndex, setRevisionDetailIndex] = useState<number | null>(null)
  const [revisionDraft, setRevisionDraft] = useState<TnaRevisionDraft>({ newExecutionDate: "", note: "" })
  const [savedRevisionHistory, setSavedRevisionHistory] = useState<TnaDetailRevisionRecord[]>([])
  const [revisionHistoryLoading, setRevisionHistoryLoading] = useState(false)
  const [revisionHistoryError, setRevisionHistoryError] = useState("")
  const revisionHistoryRequestIdRef = useRef(0)
  const selectedBuyerId = selectedBuyer?.value?.trim() ?? ""
  const title = mode === "create" ? "Create TNA" : "Edit TNA"
  const description = mode === "create" ? "Add a TNA record with its task timeline." : "Update the selected TNA record."
  const pendingStartDateLabel = pendingStartDate
    ? pendingStartDate.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      weekday: "short",
      year: "numeric",
    })
    : "No date selected"

  const {
    control,
    handleSubmit,
    getValues,
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

  const { fields, append, remove, move, replace } = useFieldArray({
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
      setImportDialogOpen(false)
      setStartDateDialogOpen(false)
      setPendingStartDate(undefined)
      setRevisionDialogOpen(false)
      setRevisionDetailIndex(null)
      setRevisionDraft({ newExecutionDate: "", note: "" })
      setSavedRevisionHistory([])
      setRevisionHistoryLoading(false)
      setRevisionHistoryError("")
      return
    }

    reset(initialValues)
    setSelectedBuyer(initialBuyer)
    setSelectedJob(initialJob)
    setJobOptions(initialJob ? [initialJob] : [])
    setJobOpen(false)
    setImportDialogOpen(false)
    setStartDateDialogOpen(false)
    setPendingStartDate(undefined)
    setRevisionDialogOpen(false)
    setRevisionDetailIndex(null)
    setRevisionDraft({ newExecutionDate: "", note: "" })
    setSavedRevisionHistory([])
    setRevisionHistoryLoading(false)
    setRevisionHistoryError("")
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
  const watchedTnaDetails = useWatch({ control, name: "tnaDetails" })
  const watchedDetails = useMemo(() => watchedTnaDetails ?? [], [watchedTnaDetails])
  const watchedLeadTime = useWatch({ control, name: "leadTime" }) ?? ""
  const leadTimeWarning = useMemo(() => getLeadTimeWarning(watchedDetails, watchedLeadTime), [watchedDetails, watchedLeadTime])
  const activeRevisionDetail = revisionDetailIndex === null ? null : watchedDetails[revisionDetailIndex] ?? null
  const activeRevisionTaskLabel = activeRevisionDetail
    ? taskOptions.find((task) => task.id === activeRevisionDetail.taskId)?.name || `Row ${(revisionDetailIndex ?? 0) + 1}`
    : ""
  const revisionPreviousExecutionDate = activeRevisionDetail?.executionDate ?? ""
  const revisionUnchanged = revisionDraft.newExecutionDate.trim() === revisionPreviousExecutionDate.trim()

  const handleValidSubmit = useCallback((values: TnaFormValues) => {
    return onSubmit(values)
  }, [onSubmit])

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

  function applyImportedRows(rows: TnaDetailFormValues[]) {
    replace(rows.length > 0 ? rows : [emptyDetailRow()])
    setImportDialogOpen(false)
  }

  const handleExecutionDateSort = useCallback(() => {
    const sortedDetails = getValues("tnaDetails")
      .map((detail, index) => ({ detail, index }))
      .sort((left, right) => {
        const leftDate = getDateSortValue(left.detail.executionDate)
        const rightDate = getDateSortValue(right.detail.executionDate)

        if (leftDate === null && rightDate === null) {
          return left.index - right.index
        }

        if (leftDate === null) return 1
        if (rightDate === null) return -1

        const dateDifference = leftDate - rightDate

        if (dateDifference !== 0) {
          return dateDifference
        }

        return left.index - right.index
      })
      .map(({ detail }) => detail)

    replace(sortedDetails)
  }, [getValues, replace])

  const handleRelationFormulaButtonClick = useCallback((index: number) => {
    const currentValue = (getValues(`tnaDetails.${index}.relationFormula`) ?? "").trim()
    setFormulaDetailIndex(index)
    setFormulaInitialValue(currentValue)
    setFormulaDialogOpen(true)
  }, [getValues])

  const handleClearRelationFormula = useCallback((index: number) => {
    setValue(`tnaDetails.${index}.relationFormula`, "", {
      shouldDirty: true,
      shouldValidate: true,
    })
  }, [setValue])

  const taskComboboxOptions = useMemo<TaskOption[]>(
    () => taskOptions.map((task) => ({ value: task.id, label: task.name })),
    [taskOptions],
  )

  const taskLabelsById = useMemo(
    () =>
      taskComboboxOptions.reduce<Record<string, string>>((labels, task) => {
        labels[task.value] = task.label
        return labels
      }, {}),
    [taskComboboxOptions],
  )

  const formulaRecalculationKey = useMemo(
    () => watchedDetails.map((detail) => `${detail.taskId}|${detail.relationFormula}`).join("||"),
    [watchedDetails],
  )

  const formulaTaskButtons = watchedDetails.map((detail, index) => {
    const taskLabel = taskComboboxOptions.find((task) => task.value === detail.taskId)?.label || `Task ${index + 1}`

    return {
      id: detail.id || `row-${index}`,
      label: `${index + 1}. ${taskLabel}`,
      taskId: detail.taskId,
      token: detail.taskId ? createTaskFormulaToken(detail.taskId) : "",
      formulaLabel: taskLabel,
    }
  })

  const getRenderedFormulaLabel = useCallback((formula: string) => {
    const renderedFormula = renderTnaRelationFormula(formula, taskLabelsById).trim()
    return renderedFormula || "Add formula"
  }, [taskLabelsById])

  const recalculateFormulaDate = useCallback((index: number, details: TnaDetailFormValues[]) => {
    const nextDate = evaluateTnaRelationFormula({ details, targetIndex: index })
    if (!nextDate || nextDate === details[index]?.executionDate) {
      return
    }

    const nextDays = index === 0
      ? 1
      : getPlanDayNumber(details[0]?.executionDate ?? "", nextDate)

    setValue(`tnaDetails.${index}.executionDate`, nextDate, {
      shouldDirty: true,
      shouldValidate: true,
    })

    const nextDetail = {
      ...details[index],
      executionDate: nextDate,
    }

    if (nextDays !== null) {
      const nextDaysValue = String(Math.max(0, nextDays))
      if (nextDaysValue !== nextDetail.days) {
        setValue(`tnaDetails.${index}.days`, nextDaysValue, {
          shouldDirty: true,
          shouldValidate: true,
        })
        details[index] = {
          ...nextDetail,
          days: nextDaysValue,
        }
        return
      }
    }

    details[index] = nextDetail
  }, [setValue])

  const recalculateDetailDates = useCallback((details: TnaDetailFormValues[]) => {
    const startDateValue = details[0]?.executionDate ?? ""

    if (!parseDateOnly(startDateValue)) {
      return
    }

    details.forEach((detail, index) => {
      const days = getPositiveInteger(detail.days)
      if (days === null) return

      const nextDate = index === 0 ? startDateValue : addDaysToDateOnly(startDateValue, days - 1)
      if (!nextDate || nextDate === detail.executionDate) return

      setValue(`tnaDetails.${index}.executionDate`, nextDate, {
        shouldDirty: true,
        shouldValidate: true,
      })
      details[index] = {
        ...detail,
        executionDate: nextDate,
      }
    })
  }, [setValue])

  const recalculateFormulaDates = useCallback((details: TnaDetailFormValues[]) => {
    details.forEach((detail, index) => {
      if (detail.relationFormula.trim()) {
        recalculateFormulaDate(index, details)
      }
    })
  }, [recalculateFormulaDate])

  const handleExecutionDateChange = useCallback((index: number, nextExecutionDate: string) => {
    const details = getValues("tnaDetails")
    if (!details[index]) return

    setValue(`tnaDetails.${index}.executionDate`, nextExecutionDate, {
      shouldDirty: true,
      shouldValidate: true,
    })

    const nextDetails = details.map((detail, detailIndex) => (
      detailIndex === index
        ? { ...detail, executionDate: nextExecutionDate }
        : detail
    ))

    if (index === 0) {
      setValue("tnaDetails.0.days", "1", {
        shouldDirty: true,
        shouldValidate: true,
      })
      return
    }

    const nextDays = getPlanDayNumber(details[0]?.executionDate ?? "", nextExecutionDate)
    if (nextDays !== null) {
      const nextDaysValue = String(Math.max(0, nextDays))
      setValue(`tnaDetails.${index}.days`, nextDaysValue, {
        shouldDirty: true,
        shouldValidate: true,
      })
      nextDetails[index] = {
        ...nextDetails[index],
        days: nextDaysValue,
      }
    }
  }, [getValues, setValue])

  const handleDaysChange = useCallback((index: number, nextDaysValue: string) => {
    const details = getValues("tnaDetails")
    const detail = details[index]
    if (!detail) return

    const nextDays = getPositiveInteger(nextDaysValue)
    if (nextDays === null) return

    const referenceDate = index === 0 ? detail.executionDate : details[0]?.executionDate
    const nextExecutionDate = referenceDate ? addDaysToDateOnly(referenceDate, nextDays - 1) : null
    if (!nextExecutionDate) return

    setValue(`tnaDetails.${index}.executionDate`, nextExecutionDate, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }, [getValues, setValue])

  const canReviseDetail = useCallback((index: number) => {
    const detail = watchedDetails[index]
    return Boolean(detail?.isPersisted && !detail.relationFormula.trim())
  }, [watchedDetails])

  const getReviseDisabledReason = useCallback((index: number) => {
    const detail = watchedDetails[index]

    if (detail?.relationFormula.trim()) {
      return "Formula-driven rows are read-only for now."
    }

    if (!detail?.isPersisted) {
      return "Save this row first before creating revision history."
    }

    return "Revise execution date"
  }, [watchedDetails])

  const loadRevisionHistory = useCallback(async (index: number) => {
    const detail = getValues(`tnaDetails.${index}`)
    if (!currentTnaId || !detail?.id || !detail.isPersisted) {
      setSavedRevisionHistory([])
      setRevisionHistoryError("")
      setRevisionHistoryLoading(false)
      return
    }

    const requestId = revisionHistoryRequestIdRef.current + 1
    revisionHistoryRequestIdRef.current = requestId
    setRevisionHistoryLoading(true)
    setRevisionHistoryError("")

    try {
      const history = await loadDetailRevisions(currentTnaId, detail.id)
      if (revisionHistoryRequestIdRef.current === requestId) {
        setSavedRevisionHistory(history)
      }
    } catch (caughtError) {
      if (revisionHistoryRequestIdRef.current === requestId) {
        setSavedRevisionHistory([])
        setRevisionHistoryError(caughtError instanceof Error ? caughtError.message : "Unable to load revision history right now.")
      }
    } finally {
      if (revisionHistoryRequestIdRef.current === requestId) {
        setRevisionHistoryLoading(false)
      }
    }
  }, [currentTnaId, getValues, loadDetailRevisions])

  const handleOpenRevisionDialog = useCallback((index: number) => {
    const detail = getValues(`tnaDetails.${index}`)
    if (!detail?.isPersisted || detail.relationFormula.trim()) return

    setRevisionDetailIndex(index)
    setRevisionDraft({
      newExecutionDate: detail.executionDate,
      note: "",
    })
    setSavedRevisionHistory([])
    setRevisionHistoryError("")
    setRevisionDialogOpen(true)
    void loadRevisionHistory(index)
  }, [getValues, loadRevisionHistory])

  const handleSaveRevision = useCallback(() => {
    if (revisionDetailIndex === null) return

    const detail = getValues(`tnaDetails.${revisionDetailIndex}`)
    if (!detail) return

    const previousExecutionDate = detail.executionDate.trim()
    const newExecutionDate = revisionDraft.newExecutionDate.trim()

    if (!previousExecutionDate || !newExecutionDate || previousExecutionDate === newExecutionDate) {
      return
    }

    const revisions = getValues(`tnaDetails.${revisionDetailIndex}.revisions`) ?? []

    handleExecutionDateChange(revisionDetailIndex, newExecutionDate)
    setValue(`tnaDetails.${revisionDetailIndex}.revisions`, [
      ...revisions,
      {
        previousExecutionDate,
        newExecutionDate,
        note: revisionDraft.note.trim(),
      },
    ], {
      shouldDirty: true,
      shouldValidate: true,
    })

    setRevisionDraft({ newExecutionDate, note: "" })
  }, [getValues, handleExecutionDateChange, revisionDetailIndex, revisionDraft.newExecutionDate, revisionDraft.note, setValue])

  useEffect(() => {
    if (!open) return

    const details = getValues("tnaDetails")
    recalculateFormulaDates(details)
  }, [formulaRecalculationKey, getValues, open, recalculateFormulaDates])

  function handleStartDateButtonClick() {
    setPendingStartDate(parseCalendarDate(getValues("tnaDetails.0.executionDate")) ?? new Date())
    setStartDateDialogOpen(true)
  }

  function handleApplyStartDate() {
    if (!pendingStartDate) return

    const startDateValue = formatCalendarDateOnly(pendingStartDate)
    const details = getValues("tnaDetails")

    if (!details.length) {
      replace([{ ...emptyDetailRow(), executionDate: startDateValue }])
      setStartDateDialogOpen(false)
      return
    }

    setValue("tnaDetails.0.executionDate", startDateValue, {
      shouldDirty: true,
      shouldValidate: true,
    })

    details[0] = {
      ...details[0],
      executionDate: startDateValue,
    }

    recalculateDetailDates(details)
    recalculateFormulaDates(details)
    setStartDateDialogOpen(false)
  }

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
              <div className="flex h-full flex-col justify-center gap-0.5">
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
                <DetailTableFieldError control={control} index={row.index} field="taskId" />
              </div>
            )}
          />
        ),
      },
      {
        id: "executionDate",
        header: () => (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md text-left font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={handleExecutionDateSort}
            aria-label="Sort execution date ascending"
          >
            <span>Execution date <span className="text-destructive">*</span></span>
            <ArrowDownNarrowWide className="size-3.5" aria-hidden="true" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="flex h-full flex-col justify-center gap-0.5">
            <ExecutionDateInputCell
              className={DETAIL_TABLE_INPUT_CLASS}
              control={control}
              disabled={Boolean(watchedDetails[row.index]?.isPersisted)}
              index={row.index}
              register={register}
              onValueChange={(value) => handleExecutionDateChange(row.index, value)}
            />
            <DetailTableFieldError control={control} index={row.index} field="executionDate" />
          </div>
        ),
      },
      {
        id: "days",
        header: () => <>Days <span className="text-destructive">*</span></>,
        cell: ({ row }) => (
          <div className="flex h-full flex-col justify-center gap-0.5">
            <DaysInputCell
              className={DETAIL_TABLE_INPUT_CLASS}
              control={control}
              disabled={Boolean(watchedDetails[row.index]?.isPersisted)}
              index={row.index}
              register={register}
              onValueChange={(value) => handleDaysChange(row.index, value)}
            />
            <DetailTableFieldError control={control} index={row.index} field="days" />
          </div>
        ),
      },
      {
        id: "relationFormula",
        header: "Formula",
        cell: ({ row }) => (
          <div className="flex h-full flex-col justify-center gap-0.5">
            <FormulaButtonCell
              control={control}
              index={row.index}
              renderFormulaLabel={getRenderedFormulaLabel}
              onClearFormula={handleClearRelationFormula}
              onOpenFormula={handleRelationFormulaButtonClick}
            />
            <DetailTableFieldError control={control} index={row.index} field="relationFormula" />
          </div>
        ),
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => {
          const stagedRevisionCount = watchedDetails[row.index]?.revisions?.length ?? 0

          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`size-7 rounded-md ${stagedRevisionCount > 0 ? "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200" : "text-slate-500 hover:text-primary"}`}
                onClick={() => handleOpenRevisionDialog(row.index)}
                disabled={!canReviseDetail(row.index)}
                title={getReviseDisabledReason(row.index)}
                aria-label={`Revise row ${row.index + 1}`}
              >
                <CalendarClock className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-md text-destructive hover:text-destructive"
                onClick={() => remove(row.index)}
                disabled={fields.length <= 1}
                aria-label={`Remove row ${row.index + 1}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )
        },
      },
    ],
    [canReviseDetail, control, fields.length, getRenderedFormulaLabel, getReviseDisabledReason, handleClearRelationFormula, handleDaysChange, handleExecutionDateChange, handleExecutionDateSort, handleOpenRevisionDialog, handleRelationFormulaButtonClick, register, remove, taskComboboxOptions, taskOptionsLoading, watchedDetails],
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
          onSubmit={handleSubmit(handleValidSubmit, handleInvalid)}
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
            <div className="flex min-h-full flex-col gap-2 px-4 py-2 sm:px-6 sm:py-2 lg:h-full lg:min-h-0">
              {loading ? (
                <div className="space-y-4 py-2">
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-1">
                  <div className="grid gap-3 md:grid-cols-3 mb-1">
                    <Controller
                      name="buyerId"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center">
                          <label htmlFor="tna-buyer" className="text-sm font-medium text-nowrap px-1">
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
                            contentClassName="overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
                          />
                          <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">{getErrorMessage(errors.buyerId?.message)}</p>
                        </div>
                      )}
                    />

                    <Controller
                      name="jobId"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center">
                          <label htmlFor="tna-job" className="text-sm font-medium text-nowrap px-1">
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
                            contentClassName="overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
                          />
                          <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">{getErrorMessage(errors.jobId?.message)}</p>
                        </div>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center">
                        <label htmlFor="tna-leadTime" className="text-sm font-medium text-nowrap px-1">
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
                    <div className="-mx-3 -mt-3 flex flex-col gap-3 border-b border-slate-200/70 bg-slate-50/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:-mt-4 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-white/10 dark:bg-slate-950/95">
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">TNA detail rows</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Each row links a task to an execution date and formula.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full rounded-xl sm:w-auto"
                          onClick={() => setImportDialogOpen(true)}
                        >
                          <Download className="size-3.5" />
                          Import
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full rounded-xl sm:w-auto"
                          onClick={handleStartDateButtonClick}
                        >
                          <CalendarIcon className="size-3.5" />
                          Set start date
                        </Button>
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

                    {leadTimeWarning ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
                        Plan uses <span className="font-semibold">{leadTimeWarning.planDays}</span> days, which is <span className="font-semibold">{leadTimeWarning.overBy}</span> day(s) over the <span className="font-semibold">{leadTimeWarning.leadTime}</span>-day lead time. Saving is allowed, but this plan is outside the target window.
                      </div>
                    ) : null}

                    <div className="space-y-2 lg:hidden">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          onDragOver={handleDetailDragOver}
                          onDrop={(event) => handleDetailDrop(event, field.id)}
                          className={`rounded-lg border border-slate-200 bg-white p-2.5 transition-opacity dark:border-white/10 dark:bg-slate-950/40 ${draggingDetailId === field.id ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                draggable
                                onDragStart={(event) => handleDetailDragStart(event, field.id)}
                                onDragEnd={() => setDraggingDetailId("")}
                                className="flex size-6 cursor-grab items-center justify-center rounded-md text-slate-400 hover:bg-slate-900/5 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
                                aria-label={`Drag row ${index + 1}`}
                              >
                                <GripVertical className="size-3" />
                              </button>
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Row {index + 1}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`size-6 rounded-md ${(watchedDetails[index]?.revisions?.length ?? 0) > 0 ? "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300" : "text-slate-500 hover:text-primary"}`}
                                onClick={() => handleOpenRevisionDialog(index)}
                                disabled={!canReviseDetail(index)}
                                title={getReviseDisabledReason(index)}
                                aria-label={`Revise row ${index + 1}`}
                              >
                                <CalendarClock className="size-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-6 rounded-md text-destructive hover:text-destructive"
                                onClick={() => remove(index)}
                                disabled={fields.length <= 1}
                                aria-label={`Remove row ${index + 1}`}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-2.5 space-y-2">
                            <Controller
                              name={`tnaDetails.${index}.taskId`}
                              control={control}
                              render={({ field: taskField }) => (
                                <div className="space-y-1">
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
                                    inputClassName="h-8 rounded-md px-1.5 text-[11px]"
                                    contentClassName="overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
                                  />
                                  <p className="min-h-3.5 text-[10px] leading-4 text-red-600 dark:text-red-300">
                                    {detailErrorAt(errors as Record<string, unknown>, index, "taskId")}
                                  </p>
                                </div>
                              )}
                            />

                              <div className="grid gap-2 min-[420px]:grid-cols-2">
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Execution date <span className="text-destructive">*</span>
                                  </label>
                                  <ExecutionDateInputCell
                                    className="h-8 rounded-md px-1.5 text-[11px]"
                                  control={control}
                                  disabled={Boolean(watchedDetails[index]?.isPersisted)}
                                  index={index}
                                  register={register}
                                  onValueChange={(value) => handleExecutionDateChange(index, value)}
                                  ariaInvalid={Boolean(detailErrorAt(errors as Record<string, unknown>, index, "executionDate"))}
                                />
                                  <p className="min-h-3.5 text-[10px] leading-4 text-red-600 dark:text-red-300">
                                  {detailErrorAt(errors as Record<string, unknown>, index, "executionDate")}
                                </p>
                              </div>

                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Days <span className="text-destructive">*</span>
                                  </label>
                                  <DaysInputCell
                                    className="h-8 rounded-md px-1.5 text-[11px]"
                                  control={control}
                                  disabled={Boolean(watchedDetails[index]?.isPersisted)}
                                  index={index}
                                  register={register}
                                  onValueChange={(value) => handleDaysChange(index, value)}
                                  ariaInvalid={Boolean(detailErrorAt(errors as Record<string, unknown>, index, "days"))}
                                />
                                  <p className="min-h-3.5 text-[10px] leading-3.5 text-red-600 dark:text-red-300">
                                  {detailErrorAt(errors as Record<string, unknown>, index, "days")}
                                </p>
                              </div>
                            </div>

                              <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                  Formula
                                </label>
                                <FormulaButtonCell
                                  className="h-8"
                                control={control}
                                index={index}
                                renderFormulaLabel={getRenderedFormulaLabel}
                                onClearFormula={handleClearRelationFormula}
                                onOpenFormula={handleRelationFormulaButtonClick}
                              />
                                <p className="min-h-3.5 text-[10px] leading-4 text-red-600 dark:text-red-300">
                                {detailErrorAt(errors as Record<string, unknown>, index, "relationFormula")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden w-full max-w-full min-w-0 overflow-auto overscroll-contain rounded-md border border-slate-200/70 bg-white pb-2 [scrollbar-gutter:stable] lg:block lg:min-h-0 lg:flex-1 dark:border-white/10 dark:bg-slate-950/40">
                      <table className="w-full min-w-230 border-collapse text-xs">
                        <thead>
                          {detailTable.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="h-9 border-b align-middle hover:bg-transparent">
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
                              className={`h-9 border-b align-middle transition-colors hover:bg-muted/50 ${draggingDetailId === row.original.id ? "opacity-60" : ""}`}
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
      {importDialogOpen ? (
        <TnaImportDialog
          open={importDialogOpen}
          currentDetails={watchedDetails}
          currentTnaId={currentTnaId}
          loadBuyerOptions={loadBuyerOptions}
          loadJobOptions={loadJobOptions}
          loadImportTnaOptions={loadImportTnaOptions}
          loadImportTnaRecord={loadImportTnaRecord}
          onImportRows={applyImportedRows}
          onOpenChange={setImportDialogOpen}
        />
      ) : null}
      <Dialog
        open={startDateDialogOpen}
        onOpenChange={(nextOpen) => {
          setStartDateDialogOpen(nextOpen)
          if (!nextOpen) {
            setPendingStartDate(undefined)
          }
        }}
      >
        <DialogContent className="overflow-hidden p-0 sm:max-w-[23rem]">
          <DialogHeader className="border-b border-slate-200/70 px-4 pb-3 pt-4 text-left dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarIcon className="size-4" />
              </span>
              <div>
                <DialogTitle>Set start date</DialogTitle>
                <DialogDescription className="mt-1">
                  Other task dates will be calculated from the Days column.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 px-4 py-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Selected date</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-950 dark:text-slate-50">{pendingStartDateLabel}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-white/10 dark:bg-slate-950/40">
              <Calendar
                mode="single"
                selected={pendingStartDate}
                onSelect={setPendingStartDate}
                captionLayout="dropdown"
                className="mx-auto w-full max-w-[17.5rem] bg-transparent p-0 [--cell-size:2rem]"
                classNames={{
                  root: "w-full",
                  months: "relative flex w-full flex-col",
                  month: "flex w-full flex-col gap-3",
                  month_caption: "flex h-9 w-full items-center justify-center px-10",
                  caption_label: "flex items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-slate-950 dark:text-slate-50 [&>svg]:size-3.5 [&>svg]:text-slate-500",
                  dropdowns: "flex h-9 w-full items-center justify-center gap-1.5 text-sm font-semibold text-slate-950 dark:text-slate-50",
                  nav: "absolute inset-x-0 top-0 flex h-9 w-full items-center justify-between",
                  button_previous: "size-7 rounded-full p-0 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]",
                  button_next: "size-7 rounded-full p-0 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]",
                  table: "w-full border-collapse",
                  weekdays: "grid grid-cols-7 border-b border-slate-100 pb-1.5 dark:border-white/10",
                  weekday: "flex h-6 items-center justify-center text-[11px] font-semibold text-slate-500 dark:text-slate-400",
                  week: "mt-1 grid grid-cols-7 gap-y-1",
                  day: "flex size-8 items-center justify-center p-0 text-center",
                  day_button: "size-7 rounded-full border-0 text-sm font-medium text-slate-800 hover:bg-slate-100 data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:text-slate-100 dark:hover:bg-white/[0.08]",
                  today: "bg-slate-100 text-slate-950 dark:bg-white/[0.08] dark:text-slate-50",
                  outside: "text-slate-400 opacity-80 dark:text-slate-500",
                }}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setStartDateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-xl" disabled={!pendingStartDate} onClick={handleApplyStartDate}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TnaRevisionDialog
        open={revisionDialogOpen}
        taskLabel={activeRevisionTaskLabel}
        previousExecutionDate={revisionPreviousExecutionDate}
        draft={revisionDraft}
        savedRevisions={savedRevisionHistory}
        pendingRevisions={activeRevisionDetail?.revisions ?? []}
        historyLoading={revisionHistoryLoading}
        historyError={revisionHistoryError}
        revisionUnchanged={revisionUnchanged}
        onDraftChange={setRevisionDraft}
        onOpenChange={(nextOpen) => {
          setRevisionDialogOpen(nextOpen)
          if (!nextOpen) {
            revisionHistoryRequestIdRef.current += 1
            setRevisionDetailIndex(null)
            setRevisionDraft({ newExecutionDate: "", note: "" })
            setSavedRevisionHistory([])
            setRevisionHistoryLoading(false)
            setRevisionHistoryError("")
          }
        }}
        onRetryHistory={() => {
          if (revisionDetailIndex !== null) {
            void loadRevisionHistory(revisionDetailIndex)
          }
        }}
        onSave={handleSaveRevision}
      />
      <TnaFormulaDialog
        open={formulaDialogOpen}
        activeTaskButtonId={formulaDetailIndex === null ? "" : (watchedDetails[formulaDetailIndex]?.id || `row-${formulaDetailIndex}`)}
        initialFormula={formulaInitialValue}
        taskButtons={formulaTaskButtons}
        onOpenChange={(nextOpen) => {
          setFormulaDialogOpen(nextOpen)
          if (!nextOpen) {
            setFormulaDetailIndex(null)
            setFormulaInitialValue("")
          }
        }}
        onSave={(formula) => {
          if (formulaDetailIndex === null) return

          const details = getValues("tnaDetails").map((detail, index) => (
            index === formulaDetailIndex ? { ...detail, relationFormula: formula } : detail
          ))

          setValue(`tnaDetails.${formulaDetailIndex}.relationFormula`, formula, {
            shouldDirty: true,
            shouldValidate: true,
          })
          if (formula.trim()) {
            recalculateFormulaDate(formulaDetailIndex, details)
          }
          setFormulaDialogOpen(false)
          setFormulaDetailIndex(null)
          setFormulaInitialValue("")
        }}
      />
    </Dialog>
  )
}
