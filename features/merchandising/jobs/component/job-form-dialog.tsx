"use client"

import { useRef, useState, type DragEvent } from "react"
import {
  GripVertical,
  Info,
  Loader2,
  PackageCheck,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import {
  AppCombobox,
  type AppComboboxLoadParams,
  type AppComboboxOption,
} from "@/components/app-combobox"
import { AppSelect } from "@/components/app-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type {
  JobAiAssistRow,
  JobDetailFormValues,
  JobDialogSectionId,
  JobFormError,
  JobFormValues,
  JobPoSummaryResult,
} from "../job.types"
import { JobAiAssistDialog } from "./job-ai-assist-dialog"
import {
  type AiAssistFocusColumn,
  type AiAssistMasterDataMatches,
  useJobAiAssistStore,
} from "./job-ai-assist.store"
import { JobPoSummaryDialog } from "./job-po-summary-dialog"

type SelectOption = AppComboboxOption

type JobFormDialogProps = {
  open: boolean
  mode: "create" | "edit"
  loading: boolean
  submitting: boolean
  values: JobFormValues
  errors: JobFormError[]
  jobNo?: string
  suggestedJobNo?: string
  selectedFactory: SelectOption | null
  selectedBuyer: SelectOption | null
  selectedMerchandiser: SelectOption | null
  loadFactoryOptions: (
    params: AppComboboxLoadParams
  ) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadBuyerOptions: (
    params: AppComboboxLoadParams
  ) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadEmployeeOptions: (
    params: AppComboboxLoadParams
  ) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadStyleOptions: (
    params: AppComboboxLoadParams
  ) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadSizeOptions: (
    params: AppComboboxLoadParams
  ) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadColorOptions: (
    params: AppComboboxLoadParams
  ) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  onFactoryOptionChange: (option: SelectOption | null) => void
  onBuyerOptionChange: (option: SelectOption | null) => void
  onMerchandiserOptionChange: (option: SelectOption | null) => void
  onValuesChange: (values: JobFormValues) => void
  onAiAssistFileAnalyze: (file: File) => Promise<JobAiAssistRow[]>
  onAiAssistRowResolve: (params: {
    row: JobAiAssistRow
    buyerId?: string
  }) => Promise<AiAssistMasterDataMatches>
  loadRecentPoOptions: (
    limit: number
  ) => Promise<Array<AppComboboxOption & { jobCount: number; rowCount: number }>>
  onPoSummarySearch: (poNumber: string) => Promise<JobPoSummaryResult>
  onUseSuggestedJobNo?: (jobNo: string) => void
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
}

const ORDER_TYPE_OPTIONS = [
  { value: "none", label: "Select order type" },
  { value: "Retail", label: "Retail" },
  { value: "Promotional", label: "Promotional" },
]

const JOB_DIALOG_INPUT_CLASS = "w-full min-w-0"
const JOB_DIALOG_FIELD_CLASS = "min-w-0 space-y-2"
const JOB_DIALOG_TABLE_INPUT_CLASS = "h-7 rounded-sm px-1.5 text-xs"

type DetailFocusColumn =
  | "quantity"
  | "fob"
  | "cm"
  | "deliveryDate"
  | "cuttingLimitPercentage"
  | "remarks"
const JOB_DIALOG_SECTIONS: Array<{
  id: JobDialogSectionId
  label: string
  icon: typeof Info
}> = [
  { id: "basic-info", label: "Basic Info", icon: Info },
  { id: "details", label: "PO Details", icon: PackageCheck },
  { id: "status", label: "Status", icon: Settings },
]

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  )
}

function newDetailRow(
  previousDetail?: Partial<JobDetailFormValues>
): JobDetailFormValues {
  return {
    id: crypto.randomUUID(),
    pono: previousDetail?.pono ?? "",
    styleId: "",
    styleLabel: "",
    sizeId: "",
    sizeLabel: "",
    colorId: "",
    colorLabel: "",
    quantity: "0",
    fob: previousDetail?.fob ?? "0",
    cm: previousDetail?.cm ?? "0",
    deliveryDate: previousDetail?.deliveryDate ?? "",
    cuttingLimitPercentage: previousDetail?.cuttingLimitPercentage ?? "0",
    remarks: "",
  }
}

function calculateTotalFob(
  quantity: string | number | null | undefined,
  fob: string | number | null | undefined
) {
  const quantityValue = Number(quantity)
  const fobValue = Number(fob)

  if (!Number.isFinite(quantityValue) || !Number.isFinite(fobValue)) {
    return "0"
  }

  const total = quantityValue * fobValue

  if (Number.isInteger(total)) {
    return String(total)
  }

  return total.toFixed(2).replace(/\.?0+$/, "")
}

function hideZeroValue(value: string | number | null | undefined) {
  const stringValue = value == null ? "" : String(value)
  return /^0(?:\.0+)?$/.test(stringValue.trim()) ? "" : stringValue
}

function sumJobDetails<
  T extends {
    quantity?: string | number | null
    fob?: string | number | null
    cm?: string | number | null
  },
>(details: T[], valueKey: "fob" | "cm") {
  return details.reduce((total, detail) => {
    const quantityValue = Number(detail.quantity)
    const unitValue = Number(detail[valueKey])

    if (!Number.isFinite(quantityValue) || !Number.isFinite(unitValue)) {
      return total
    }

    return total + quantityValue * unitValue
  }, 0)
}

function sumJobCmPerDzn<
  T extends { quantity?: string | number | null; cm?: string | number | null },
>(details: T[]) {
  return details.reduce((total, detail) => {
    const quantityValue = Number(detail.quantity)
    const cmPerDznValue = Number(detail.cm)

    if (!Number.isFinite(quantityValue) || !Number.isFinite(cmPerDznValue)) {
      return total
    }

    return total + quantityValue * (cmPerDznValue / 12)
  }, 0)
}

function sumJobQuantities<T extends { quantity?: string | number | null }>(
  details: T[]
) {
  return details.reduce((total, detail) => {
    const quantityValue = Number(detail.quantity)

    if (!Number.isFinite(quantityValue)) {
      return total
    }

    return total + quantityValue
  }, 0)
}

function formatSummaryValue(value: number) {
  if (!Number.isFinite(value)) {
    return "0"
  }

  if (Number.isInteger(value)) {
    return String(value)
  }

  return value.toFixed(2).replace(/\.?0+$/, "")
}

function formatAiAssistDateForInput(value: string | null | undefined) {
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    return ""
  }

  const isoMatch = normalizedValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`
  }

  const monthMap: Record<string, string> = {
    jan: "01",
    january: "01",
    feb: "02",
    february: "02",
    mar: "03",
    march: "03",
    apr: "04",
    april: "04",
    may: "05",
    jun: "06",
    june: "06",
    jul: "07",
    july: "07",
    aug: "08",
    august: "08",
    sep: "09",
    sept: "09",
    september: "09",
    oct: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    december: "12",
  }
  const parts = normalizedValue
    .toLowerCase()
    .split(/[\s\-/.]+/)
    .filter(Boolean)

  if (parts.length >= 3) {
    const [dayPart, monthPart, yearPart] = parts
    const day = Number(dayPart)
    const month =
      monthMap[monthPart] ??
      (Number(monthPart) >= 1 && Number(monthPart) <= 12
        ? String(Number(monthPart)).padStart(2, "0")
        : "")
    const year = Number(yearPart)

    if (day >= 1 && day <= 31 && month && year >= 1900) {
      return `${year}-${month}-${String(day).padStart(2, "0")}`
    }
  }

  return ""
}

function RailItem({
  section,
  active,
  count,
  hasError,
  onClick,
}: {
  section: (typeof JOB_DIALOG_SECTIONS)[number]
  active: boolean
  count?: number
  hasError: boolean
  onClick: () => void
}) {
  const Icon = section.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-slate-600 transition-colors outline-none dark:text-slate-300",
        active
          ? "border-l-2 border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300"
          : "hover:bg-slate-900/5 dark:hover:bg-white/[0.04]",
        hasError && !active ? "text-red-600 dark:text-red-300" : ""
      )}
    >
      <Icon className="size-4" />
      <span className="min-w-0 flex-1 truncate">{section.label}</span>
      {hasError ? <span className="size-2 rounded-full bg-red-500" /> : null}
      {typeof count === "number" ? (
        <Badge className="rounded-md bg-blue-600/15 px-2 py-0 text-xs text-blue-700 hover:bg-blue-600/15 dark:text-blue-200">
          {count}
        </Badge>
      ) : null}
    </button>
  )
}

export function JobFormDialog({
  open,
  mode,
  loading,
  submitting,
  values,
  errors,
  jobNo,
  suggestedJobNo,
  selectedFactory,
  selectedBuyer,
  selectedMerchandiser,
  loadFactoryOptions,
  loadBuyerOptions,
  loadEmployeeOptions,
  loadStyleOptions,
  loadSizeOptions,
  loadColorOptions,
  onFactoryOptionChange,
  onBuyerOptionChange,
  onMerchandiserOptionChange,
  onValuesChange,
  onAiAssistFileAnalyze,
  onAiAssistRowResolve,
  loadRecentPoOptions,
  onPoSummarySearch,
  onUseSuggestedJobNo,
  onOpenChange,
  onSubmit,
}: JobFormDialogProps) {
  const [factoryOpen, setFactoryOpen] = useState(false)
  const [buyerOpen, setBuyerOpen] = useState(false)
  const [employeeOpen, setEmployeeOpen] = useState(false)
  const [activeSection, setActiveSection] =
    useState<JobDialogSectionId>("basic-info")
  const [poSummaryOpen, setPoSummaryOpen] = useState(false)
  const [openRowControl, setOpenRowControl] = useState("")
  const [draggingDetailId, setDraggingDetailId] = useState("")
  const aiAssistFile = useJobAiAssistStore((state) => state.file)
  const aiAssistRows = useJobAiAssistStore((state) => state.rows)
  const aiAssistWorking = useJobAiAssistStore((state) => state.working)
  const addingAiAssistRowIndex = useJobAiAssistStore(
    (state) => state.addingRowIndex
  )
  const focusedAiAssistCell = useJobAiAssistStore((state) => state.focusedCell)
  const setAiAssistOpen = useJobAiAssistStore((state) => state.setOpen)
  const selectAiAssistFile = useJobAiAssistStore((state) => state.selectFile)
  const setAiAssistError = useJobAiAssistStore((state) => state.setError)
  const setAiAssistWorking = useJobAiAssistStore((state) => state.setWorking)
  const setAddingAiAssistRowIndex = useJobAiAssistStore(
    (state) => state.setAddingRowIndex
  )
  const fillAiAssistColumnDownInStore = useJobAiAssistStore(
    (state) => state.fillColumnDown
  )
  const markAiAssistRowAdded = useJobAiAssistStore(
    (state) => state.markRowAdded
  )
  const resetAiAssistRowsForAnalyze = useJobAiAssistStore(
    (state) => state.resetRowsForAnalyze
  )
  const completeAiAssistAnalyze = useJobAiAssistStore(
    (state) => state.completeAnalyze
  )
  const contentViewportRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<Record<JobDialogSectionId, HTMLElement | null>>({
    "basic-info": null,
    details: null,
    status: null,
  })
  const errorSectionSet = new Set(errors.map((error) => error.section))

  function update<K extends keyof JobFormValues>(
    field: K,
    value: JobFormValues[K]
  ) {
    onValuesChange({ ...values, [field]: value })
  }

  function updateDetail(id: string, patch: Partial<JobDetailFormValues>) {
    update(
      "jobDetails",
      values.jobDetails.map((detail) =>
        detail.id === id ? { ...detail, ...patch } : detail
      )
    )
  }

  function updateDetailFromRow(
    index: number,
    patch: Partial<JobDetailFormValues>
  ) {
    update(
      "jobDetails",
      values.jobDetails.map((detail, detailIndex) =>
        detailIndex >= index ? { ...detail, ...patch } : detail
      )
    )
  }

  function addDetail() {
    const previousDetail = values.jobDetails[values.jobDetails.length - 1]
    update("jobDetails", [...values.jobDetails, newDetailRow(previousDetail)])
  }

  function openAiAssistDialog() {
    setAiAssistOpen(true)
  }

  function handleAiAssistFileChange(file: File | null) {
    selectAiAssistFile(file)

    if (file) {
      void analyzeAiAssistFile(file)
    }
  }

  async function analyzeAiAssistFile(fileToAnalyze = aiAssistFile) {
    if (!fileToAnalyze || aiAssistWorking) {
      return
    }

    setAiAssistWorking(true)
    setAiAssistError("")
    try {
      const rows = await onAiAssistFileAnalyze(fileToAnalyze)
      completeAiAssistAnalyze(rows)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to analyze this file right now."
      resetAiAssistRowsForAnalyze()
      setAiAssistError(message)
    } finally {
      setAiAssistWorking(false)
    }
  }

  function getAiAssistCellValue(
    row: JobAiAssistRow,
    column: AiAssistFocusColumn
  ) {
    if (column === "deliveryDate") {
      return formatAiAssistDateForInput(row.deliveryDate)
    }

    return row[column]
  }

  function fillAiAssistColumnDown(cell = focusedAiAssistCell) {
    if (!cell || cell.rowIndex >= aiAssistRows.length - 1) {
      return
    }

    const sourceRow = aiAssistRows[cell.rowIndex]
    if (!sourceRow) {
      return
    }

    const value = getAiAssistCellValue(sourceRow, cell.column)
    fillAiAssistColumnDownInStore(cell, value)
    focusAiAssistField(cell.rowIndex, cell.column)
  }

  function appendAiAssistRowToDetails(
    row: JobAiAssistRow,
    index: number,
    matches: AiAssistMasterDataMatches
  ) {
    const previousDetail = values.jobDetails[values.jobDetails.length - 1]
    const nextDetail: JobDetailFormValues = {
      ...newDetailRow(previousDetail),
      pono: row.poNumber.trim(),
      styleId: matches.styleOption?.value ?? "",
      styleLabel: matches.styleOption?.label ?? "",
      sizeId: matches.sizeOption?.value ?? "",
      sizeLabel: matches.sizeOption?.label ?? "",
      colorId: matches.colorOption?.value ?? "",
      colorLabel: matches.colorOption?.label ?? "",
      quantity: String(row.quantity || 0),
      fob: row.fob == null ? "0" : String(row.fob),
      deliveryDate: formatAiAssistDateForInput(row.deliveryDate),
      cuttingLimitPercentage: previousDetail?.cuttingLimitPercentage ?? "0",
    }

    update("jobDetails", [...values.jobDetails, nextDetail])
    markAiAssistRowAdded(row, index)
  }

  async function addAiAssistRowToDetails(row: JobAiAssistRow, index: number) {
    if (addingAiAssistRowIndex !== null) {
      return
    }

    setAddingAiAssistRowIndex(index)
    setAiAssistError("")

    try {
      const matches = await onAiAssistRowResolve({
        row,
        buyerId: values.buyerId.trim() || undefined,
      })
      appendAiAssistRowToDetails(row, index, matches)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to add this AI Assist row to PO Details."
      setAiAssistError(message)
    } finally {
      setAddingAiAssistRowIndex(null)
    }
  }

  function removeDetail(id: string) {
    update(
      "jobDetails",
      values.jobDetails.filter((detail) => detail.id !== id)
    )
  }

  function reorderDetail(sourceId: string, targetId: string) {
    if (!sourceId || sourceId === targetId) {
      return
    }

    const sourceIndex = values.jobDetails.findIndex(
      (detail) => detail.id === sourceId
    )
    const targetIndex = values.jobDetails.findIndex(
      (detail) => detail.id === targetId
    )

    if (sourceIndex < 0 || targetIndex < 0) {
      return
    }

    const nextDetails = [...values.jobDetails]
    const [movedDetail] = nextDetails.splice(sourceIndex, 1)
    nextDetails.splice(targetIndex, 0, movedDetail)
    update("jobDetails", nextDetails)
  }

  function handleDetailDragStart(
    event: DragEvent<HTMLElement>,
    detailId: string
  ) {
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
    reorderDetail(
      event.dataTransfer.getData("text/plain") || draggingDetailId,
      targetId
    )
    setDraggingDetailId("")
  }

  function getDetailFocusAttribute(column: DetailFocusColumn) {
    const attributes: Record<DetailFocusColumn, string> = {
      quantity: "data-job-detail-quantity",
      fob: "data-job-detail-fob",
      cm: "data-job-detail-cm",
      deliveryDate: "data-job-detail-deliverydate",
      cuttingLimitPercentage: "data-job-detail-cutting-limit-percentage",
      remarks: "data-job-detail-remarks",
    }

    return attributes[column]
  }

  function getAiAssistFocusAttribute(column: AiAssistFocusColumn) {
    const attributes: Record<AiAssistFocusColumn, string> = {
      poNumber: "data-ai-assist-po-number",
      styleNo: "data-ai-assist-style-no",
      styleName: "data-ai-assist-style-name",
      color: "data-ai-assist-color",
      size: "data-ai-assist-size",
      quantity: "data-ai-assist-quantity",
      fob: "data-ai-assist-fob",
      deliveryDate: "data-ai-assist-delivery-date",
    }

    return attributes[column]
  }

  function focusNextDetailField(
    currentIndex: number,
    column: DetailFocusColumn
  ) {
    const nextDetail = values.jobDetails[currentIndex + 1]

    if (!nextDetail) {
      return
    }

    window.requestAnimationFrame(() => {
      const attribute = getDetailFocusAttribute(column)
      const nextInput = Array.from(
        document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          `[${attribute}="${nextDetail.id}"]`
        )
      ).find((input) => input.offsetParent !== null)
      nextInput?.focus()
      nextInput?.select()
    })
  }

  function handleDetailFieldKeyDown(
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    currentIndex: number,
    column: DetailFocusColumn
  ) {
    if (event.key !== "Enter") {
      return
    }

    event.preventDefault()
    focusNextDetailField(currentIndex, column)
  }

  function focusAiAssistField(rowIndex: number, column: AiAssistFocusColumn) {
    const row = aiAssistRows[rowIndex]

    if (!row) {
      return
    }

    window.requestAnimationFrame(() => {
      const attribute = getAiAssistFocusAttribute(column)
      const input = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          `[${attribute}="${rowIndex}"]`
        )
      ).find((field) => field.offsetParent !== null)
      input?.focus()
      input?.select()
    })
  }

  function handleAiAssistFieldKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    currentIndex: number,
    column: AiAssistFocusColumn
  ) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
      event.preventDefault()
      fillAiAssistColumnDown({ rowIndex: currentIndex, column })
      return
    }

    if (event.key !== "Enter") {
      return
    }

    event.preventDefault()
    focusAiAssistField(
      event.ctrlKey ? currentIndex - 1 : currentIndex + 1,
      column
    )
  }

  function scrollToSection(sectionId: JobDialogSectionId) {
    const sectionElement = sectionRefs.current[sectionId]
    const scrollContainer = contentViewportRef.current

    if (!sectionElement || !scrollContainer) {
      sectionElement?.scrollIntoView({ behavior: "smooth", block: "start" })
      setActiveSection(sectionId)
      return
    }

    const containerRect = scrollContainer.getBoundingClientRect()
    const sectionRect = sectionElement.getBoundingClientRect()
    const topOffset =
      sectionRect.top - containerRect.top + scrollContainer.scrollTop

    scrollContainer.scrollTo({
      top: Math.max(0, topOffset - 12),
      behavior: "smooth",
    })
    setActiveSection(sectionId)
  }

  const totalFobSummary = formatSummaryValue(
    sumJobDetails(values.jobDetails, "fob")
  )
  const totalCmSummary = formatSummaryValue(sumJobCmPerDzn(values.jobDetails))
  const totalQuantitySummary = formatSummaryValue(
    sumJobQuantities(values.jobDetails)
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-0 left-0 h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-slate-200/70 bg-slate-50 p-0 shadow-2xl sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg 2xl:w-[min(1600px,calc(100vw-2rem))] 2xl:max-w-[min(1600px,calc(100vw-2rem))] dark:border-white/10 dark:bg-[#080a14]">
        <form
          className="grid h-full min-h-0 w-full max-w-full min-w-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden sm:max-h-[calc(100vh-2rem)] sm:min-h-[78vh]"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <div className="flex min-h-0 w-full max-w-full min-w-0 overflow-hidden">
            <aside className="hidden w-[230px] shrink-0 border-r border-slate-200/70 bg-white/55 p-3 lg:block dark:border-white/10 dark:bg-[#0a0d19]/90">
              <nav className="space-y-2">
                {JOB_DIALOG_SECTIONS.map((section) => (
                  <RailItem
                    key={section.id}
                    section={section}
                    active={activeSection === section.id}
                    count={
                      section.id === "details"
                        ? values.jobDetails.length
                        : undefined
                    }
                    hasError={errorSectionSet.has(section.id)}
                    onClick={() => scrollToSection(section.id)}
                  />
                ))}
              </nav>
            </aside>

            <div className="min-h-0 w-full max-w-full min-w-0 overflow-hidden">
              <ScrollArea
                className="h-full min-h-0 w-full max-w-full min-w-0 overflow-hidden"
                viewportRef={contentViewportRef}
                viewportClassName="overflow-x-hidden [&>div]:!block [&>div]:!w-full [&>div]:!min-w-0 [&>div]:!max-w-full"
              >
                <div className="w-full max-w-full min-w-0 space-y-2.5 overflow-x-hidden p-2 sm:p-3">
                  <DialogHeader className="rounded-lg border border-slate-200/70 bg-white/90 p-3 dark:border-white/10 dark:bg-[#17131d]/90">
                    <DialogTitle>
                      {mode === "create"
                        ? "Create job entry"
                        : "Edit job entry"}
                    </DialogTitle>
                    <DialogDescription>
                      Manage order header data and PO detail rows. PO numbers
                      are resolved automatically by the backend.
                    </DialogDescription>
                  </DialogHeader>

                  {errors.length > 0 ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                      <p className="font-medium">Please fix the following:</p>
                      <ul className="mt-1 space-y-1">
                        {errors.map((error) => (
                          <li key={`${error.section}-${error.message}`}>
                            {error.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {loading ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {Array.from({ length: 12 }).map((_, index) => (
                        <Skeleton key={index} className="h-10 rounded-xl" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <Card
                        ref={(element) => {
                          sectionRefs.current["basic-info"] = element
                        }}
                        id="basic-info"
                        className="max-w-full min-w-0 scroll-mt-3 overflow-hidden rounded-lg border-slate-200/70 bg-white/75 shadow-none dark:border-white/10 dark:bg-[#17131d]/80"
                      >
                        <CardHeader className="px-4 pt-3 pb-2">
                          <CardTitle className="text-sm">Basic Info</CardTitle>
                        </CardHeader>
                        <CardContent className="grid max-w-full min-w-0 gap-4 px-3 pb-3 sm:px-4 md:grid-cols-2 xl:grid-cols-3">
                          <div className={JOB_DIALOG_FIELD_CLASS}>
                            <FieldLabel>Job No</FieldLabel>
                            <Input
                              className={JOB_DIALOG_INPUT_CLASS}
                              value={values.jobNo}
                              onChange={(event) =>
                                update("jobNo", event.target.value)
                              }
                              maxLength={50}
                              placeholder={
                                mode === "create"
                                  ? jobNo || "Auto generated"
                                  : "Clear to keep current number"
                              }
                            />
                            {suggestedJobNo ? (
                              <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                                <span>
                                  Use next available job number {suggestedJobNo}
                                  , or enter another job number.
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-full rounded-md px-2 text-xs sm:w-auto"
                                  onClick={() =>
                                    onUseSuggestedJobNo?.(suggestedJobNo)
                                  }
                                >
                                  Use {suggestedJobNo}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          <div className={JOB_DIALOG_FIELD_CLASS}>
                            <FieldLabel required>Factory</FieldLabel>
                            <AppCombobox
                              open={factoryOpen}
                              onOpenChange={setFactoryOpen}
                              value={selectedFactory}
                              onValueChange={(option) => {
                                onFactoryOptionChange(option)
                                update("factoryId", option?.value ?? "")
                                setFactoryOpen(false)
                              }}
                              loadItems={loadFactoryOptions}
                              initialLimit={10}
                              searchLimit={10}
                              placeholder="Search factory"
                              showClear={Boolean(values.factoryId)}
                              inputClassName={JOB_DIALOG_INPUT_CLASS}
                              contentClassName="rounded-lg"
                            />
                          </div>
                          <div className={JOB_DIALOG_FIELD_CLASS}>
                            <FieldLabel required>Buyer</FieldLabel>
                            <AppCombobox
                              open={buyerOpen}
                              onOpenChange={setBuyerOpen}
                              value={selectedBuyer}
                              onValueChange={(option) => {
                                onBuyerOptionChange(option)
                                update("buyerId", option?.value ?? "")
                                setBuyerOpen(false)
                              }}
                              loadItems={loadBuyerOptions}
                              initialLimit={10}
                              searchLimit={10}
                              placeholder="Search buyer"
                              showClear={Boolean(values.buyerId)}
                              inputClassName={JOB_DIALOG_INPUT_CLASS}
                              contentClassName="rounded-lg"
                            />
                          </div>
                          <div className={JOB_DIALOG_FIELD_CLASS}>
                            <FieldLabel>Order Type</FieldLabel>
                            <AppSelect
                              value={values.ordertype || "none"}
                              onValueChange={(value) =>
                                update(
                                  "ordertype",
                                  value === "none" ? "" : value
                                )
                              }
                              options={ORDER_TYPE_OPTIONS}
                              triggerClassName={JOB_DIALOG_INPUT_CLASS}
                            />
                          </div>
                          <div className={JOB_DIALOG_FIELD_CLASS}>
                            <FieldLabel>Merchandiser</FieldLabel>
                            <AppCombobox
                              open={employeeOpen}
                              onOpenChange={setEmployeeOpen}
                              value={selectedMerchandiser}
                              onValueChange={(option) => {
                                onMerchandiserOptionChange(option)
                                update("merchandiserId", option?.value ?? "")
                                setEmployeeOpen(false)
                              }}
                              loadItems={loadEmployeeOptions}
                              initialLimit={10}
                              searchLimit={10}
                              placeholder="Search employee"
                              showClear={Boolean(values.merchandiserId)}
                              inputClassName={JOB_DIALOG_INPUT_CLASS}
                              contentClassName="rounded-lg"
                            />
                          </div>
                          <div className={JOB_DIALOG_FIELD_CLASS}>
                            <FieldLabel>PO Receive Date</FieldLabel>
                            <Input
                              className={JOB_DIALOG_INPUT_CLASS}
                              type="date"
                              value={values.poReceiveDate}
                              onChange={(event) =>
                                update("poReceiveDate", event.target.value)
                              }
                            />
                          </div>
                          <div className={JOB_DIALOG_FIELD_CLASS}>
                            <FieldLabel>Total PO Qty</FieldLabel>
                            <Input
                              value={values.totalPoQty}
                              readOnly
                              className="w-full min-w-0 bg-slate-100 dark:bg-white/[0.04]"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <Card
                        ref={(element) => {
                          sectionRefs.current.details = element
                        }}
                        id="details"
                        className="max-w-full min-w-0 scroll-mt-3 overflow-hidden rounded-lg border-slate-200/70 bg-white/75 shadow-none dark:border-white/10 dark:bg-[#17131d]/80"
                      >
                        <CardHeader className="border-b border-slate-200/70 px-4 py-2.5 dark:border-white/10">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <CardTitle className="text-sm">
                              PO Details
                            </CardTitle>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 w-full rounded-md border-blue-500/60 px-2 text-xs text-blue-600 sm:h-7 sm:w-auto dark:text-blue-300"
                                onClick={() => setPoSummaryOpen(true)}
                              >
                                <Search className="size-3.5" />
                                PO Summary
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 w-full rounded-md border-blue-500/60 px-2 text-xs text-blue-600 sm:h-7 sm:w-auto dark:text-blue-300"
                                onClick={openAiAssistDialog}
                              >
                                <Sparkles className="size-3.5" />
                                AI Assist
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 w-full rounded-md border-blue-500/60 px-2 text-xs text-blue-600 sm:h-7 sm:w-auto dark:text-blue-300"
                                onClick={addDetail}
                              >
                                <Plus className="size-3.5" />
                                Add row
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="max-w-full min-w-0 space-y-3 p-3">
                          {values.jobDetails.length === 0 ? (
                            <div className="rounded-md border border-dashed border-slate-200/70 px-3 py-8 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                              No PO detail rows added yet.
                            </div>
                          ) : (
                            <>
                              <div className="space-y-3 lg:hidden">
                                {values.jobDetails.map((detail, index) => (
                                  <div
                                    key={detail.id}
                                    onDragOver={handleDetailDragOver}
                                    onDrop={(event) =>
                                      handleDetailDrop(event, detail.id)
                                    }
                                    className={cn(
                                      "rounded-md border border-slate-200/70 bg-white/60 p-3 transition-opacity dark:border-white/10 dark:bg-slate-950/40",
                                      draggingDetailId === detail.id
                                        ? "opacity-60"
                                        : ""
                                    )}
                                  >
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          draggable
                                          onDragStart={(event) =>
                                            handleDetailDragStart(
                                              event,
                                              detail.id
                                            )
                                          }
                                          onDragEnd={() =>
                                            setDraggingDetailId("")
                                          }
                                          className="flex size-7 cursor-grab items-center justify-center rounded-md text-slate-400 hover:bg-slate-900/5 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
                                          aria-label={`Drag row ${index + 1}`}
                                        >
                                          <GripVertical className="size-4" />
                                        </button>
                                        <Badge
                                          variant="secondary"
                                          className="rounded-md"
                                        >
                                          Row {index + 1}
                                        </Badge>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 rounded-md text-red-500 hover:text-red-600"
                                        onClick={() => removeDetail(detail.id)}
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                      <div className={JOB_DIALOG_FIELD_CLASS}>
                                        <FieldLabel required>
                                          PO Number
                                        </FieldLabel>
                                        <Input
                                          className={JOB_DIALOG_INPUT_CLASS}
                                          value={detail.pono}
                                          onChange={(event) =>
                                            updateDetail(detail.id, {
                                              pono: event.target.value,
                                            })
                                          }
                                          placeholder="Input PO number"
                                        />
                                      </div>
                                      <div className={JOB_DIALOG_FIELD_CLASS}>
                                        <FieldLabel required>Style</FieldLabel>
                                        <AppCombobox
                                          open={
                                            openRowControl ===
                                            `${detail.id}:style`
                                          }
                                          onOpenChange={(open) =>
                                            setOpenRowControl(
                                              open ? `${detail.id}:style` : ""
                                            )
                                          }
                                          value={
                                            detail.styleId
                                              ? {
                                                  value: detail.styleId,
                                                  label:
                                                    detail.styleLabel ||
                                                    detail.styleId,
                                                }
                                              : null
                                          }
                                          onValueChange={(option) => {
                                            updateDetail(detail.id, {
                                              styleId: option?.value ?? "",
                                              styleLabel: option?.label ?? "",
                                            })
                                            setOpenRowControl("")
                                          }}
                                          loadItems={loadStyleOptions}
                                          placeholder="Search style"
                                          showClear={Boolean(detail.styleId)}
                                          inputClassName={
                                            JOB_DIALOG_INPUT_CLASS
                                          }
                                          contentClassName="rounded-lg"
                                        />
                                      </div>
                                      <div className={JOB_DIALOG_FIELD_CLASS}>
                                        <FieldLabel required>Size</FieldLabel>
                                        <AppCombobox
                                          open={
                                            openRowControl ===
                                            `${detail.id}:size`
                                          }
                                          onOpenChange={(open) =>
                                            setOpenRowControl(
                                              open ? `${detail.id}:size` : ""
                                            )
                                          }
                                          value={
                                            detail.sizeId
                                              ? {
                                                  value: detail.sizeId,
                                                  label: detail.sizeLabel,
                                                }
                                              : null
                                          }
                                          onValueChange={(option) => {
                                            updateDetail(detail.id, {
                                              sizeId: option?.value ?? "",
                                              sizeLabel: option?.label ?? "",
                                            })
                                            setOpenRowControl("")
                                          }}
                                          loadItems={loadSizeOptions}
                                          placeholder="Search size"
                                          showClear={Boolean(detail.sizeId)}
                                          inputClassName={
                                            JOB_DIALOG_INPUT_CLASS
                                          }
                                          contentClassName="rounded-lg"
                                        />
                                      </div>
                                      <div className={JOB_DIALOG_FIELD_CLASS}>
                                        <FieldLabel required>Color</FieldLabel>
                                        <AppCombobox
                                          open={
                                            openRowControl ===
                                            `${detail.id}:color`
                                          }
                                          onOpenChange={(open) =>
                                            setOpenRowControl(
                                              open ? `${detail.id}:color` : ""
                                            )
                                          }
                                          value={
                                            detail.colorId
                                              ? {
                                                  value: detail.colorId,
                                                  label: detail.colorLabel,
                                                }
                                              : null
                                          }
                                          onValueChange={(option) => {
                                            updateDetail(detail.id, {
                                              colorId: option?.value ?? "",
                                              colorLabel: option?.label ?? "",
                                            })
                                            setOpenRowControl("")
                                          }}
                                          loadItems={loadColorOptions}
                                          placeholder="Search color"
                                          showClear={Boolean(detail.colorId)}
                                          inputClassName={
                                            JOB_DIALOG_INPUT_CLASS
                                          }
                                          contentClassName="rounded-lg"
                                        />
                                      </div>
                                      <Input
                                        className={JOB_DIALOG_INPUT_CLASS}
                                        value={hideZeroValue(detail.quantity)}
                                        onChange={(event) =>
                                          updateDetail(detail.id, {
                                            quantity: event.target.value,
                                          })
                                        }
                                        onKeyDown={(event) =>
                                          handleDetailFieldKeyDown(
                                            event,
                                            index,
                                            "quantity"
                                          )
                                        }
                                        inputMode="decimal"
                                        placeholder="Quantity"
                                        data-job-detail-quantity={detail.id}
                                      />
                                      <Input
                                        className={JOB_DIALOG_INPUT_CLASS}
                                        value={hideZeroValue(detail.fob)}
                                        onChange={(event) =>
                                          updateDetailFromRow(index, {
                                            fob: event.target.value,
                                          })
                                        }
                                        onKeyDown={(event) =>
                                          handleDetailFieldKeyDown(
                                            event,
                                            index,
                                            "fob"
                                          )
                                        }
                                        inputMode="decimal"
                                        placeholder="FOB"
                                        data-job-detail-fob={detail.id}
                                      />
                                      <Input
                                        className={JOB_DIALOG_INPUT_CLASS}
                                        value={hideZeroValue(
                                          calculateTotalFob(
                                            detail.quantity,
                                            detail.fob
                                          )
                                        )}
                                        readOnly
                                        placeholder="Total FOB"
                                      />
                                      <Input
                                        className={JOB_DIALOG_INPUT_CLASS}
                                        value={hideZeroValue(detail.cm)}
                                        onChange={(event) =>
                                          updateDetailFromRow(index, {
                                            cm: event.target.value,
                                          })
                                        }
                                        onKeyDown={(event) =>
                                          handleDetailFieldKeyDown(
                                            event,
                                            index,
                                            "cm"
                                          )
                                        }
                                        inputMode="decimal"
                                        placeholder="CM/Dzn"
                                        data-job-detail-cm={detail.id}
                                      />
                                      <Input
                                        className={JOB_DIALOG_INPUT_CLASS}
                                        type="date"
                                        value={detail.deliveryDate}
                                        onChange={(event) =>
                                          updateDetailFromRow(index, {
                                            deliveryDate: event.target.value,
                                          })
                                        }
                                        onKeyDown={(event) =>
                                          handleDetailFieldKeyDown(
                                            event,
                                            index,
                                            "deliveryDate"
                                          )
                                        }
                                        data-job-detail-deliverydate={detail.id}
                                      />
                                      <Input
                                        className={JOB_DIALOG_INPUT_CLASS}
                                        value={hideZeroValue(
                                          detail.cuttingLimitPercentage
                                        )}
                                        onChange={(event) =>
                                          updateDetailFromRow(index, {
                                            cuttingLimitPercentage:
                                              event.target.value,
                                          })
                                        }
                                        onKeyDown={(event) =>
                                          handleDetailFieldKeyDown(
                                            event,
                                            index,
                                            "cuttingLimitPercentage"
                                          )
                                        }
                                        inputMode="decimal"
                                        placeholder="Cutting Limit %"
                                        data-job-detail-cutting-limit-percentage={
                                          detail.id
                                        }
                                      />
                                      <Textarea
                                        className="w-full min-w-0 rounded-md text-sm md:col-span-2 xl:col-span-4"
                                        value={detail.remarks}
                                        onChange={(event) =>
                                          updateDetail(detail.id, {
                                            remarks: event.target.value,
                                          })
                                        }
                                        onKeyDown={(event) =>
                                          handleDetailFieldKeyDown(
                                            event,
                                            index,
                                            "remarks"
                                          )
                                        }
                                        placeholder="Remarks"
                                        rows={2}
                                        data-job-detail-remarks={detail.id}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="hidden w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-md border border-slate-200/70 pb-2 [scrollbar-gutter:stable] lg:block dark:border-white/10">
                                <table className="w-full min-w-[1300px] border-collapse text-xs">
                                  <thead>
                                    <tr className="h-9 border-b hover:bg-transparent">
                                      <th className="w-12 px-1.5 py-2 text-left font-medium whitespace-nowrap text-foreground">
                                        #
                                      </th>
                                      <th className="min-w-44 px-1.5 py-2 text-left font-medium whitespace-nowrap text-foreground">
                                        PO Number
                                      </th>
                                      <th className="min-w-48 px-1.5 py-2 text-left font-medium whitespace-nowrap text-foreground">
                                        Style
                                      </th>
                                      <th className="min-w-28 px-1.5 py-2 text-left font-medium whitespace-nowrap text-foreground">
                                        Size
                                      </th>
                                      <th className="min-w-32 px-1.5 py-2 text-left font-medium whitespace-nowrap text-foreground">
                                        Color
                                      </th>
                                      <th className="w-16 min-w-16 px-1.5 py-2 text-left font-medium whitespace-nowrap text-foreground">
                                        Qty
                                      </th>
                                      <th className="w-16 min-w-16 px-1.5 py-2 text-left font-medium whitespace-nowrap text-foreground">
                                        FOB
                                      </th>
                                      <th className="px-1.5 py-2 text-left font-medium whitespace-nowrap text-foreground">
                                        Total FOB
                                      </th>
                                      <th className="w-20 px-1.5 py-2 text-left font-medium whitespace-nowrap text-foreground">
                                        CM/Dzn
                                      </th>
                                      <th className="min-w-32 px-1.5 py-2 text-left font-medium whitespace-nowrap text-foreground">
                                        Delivery
                                      </th>
                                      <th className="min-w-32 px-1.5 py-2 text-left font-medium whitespace-nowrap text-foreground">
                                        Cutting Limit %
                                      </th>
                                      <th className="min-w-56 px-1.5 py-2 text-left font-medium whitespace-nowrap text-foreground">
                                        Remarks
                                      </th>
                                      <th className="w-12 px-1.5 py-2 text-right font-medium whitespace-nowrap text-foreground">
                                        Action
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {values.jobDetails.map((detail, index) => (
                                      <tr
                                        key={detail.id}
                                        onDragOver={handleDetailDragOver}
                                        onDrop={(event) =>
                                          handleDetailDrop(event, detail.id)
                                        }
                                        className={cn(
                                          "border-b align-top transition-colors hover:bg-muted/50",
                                          draggingDetailId === detail.id
                                            ? "opacity-60"
                                            : ""
                                        )}
                                      >
                                        <td className="px-1.5 py-2 align-top text-xs whitespace-nowrap">
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              draggable
                                              onDragStart={(event) =>
                                                handleDetailDragStart(
                                                  event,
                                                  detail.id
                                                )
                                              }
                                              onDragEnd={() =>
                                                setDraggingDetailId("")
                                              }
                                              className="flex size-6 cursor-grab items-center justify-center rounded-md text-slate-400 hover:bg-slate-900/5 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
                                              aria-label={`Drag row ${index + 1}`}
                                            >
                                              <GripVertical className="size-3.5" />
                                            </button>
                                            <span>{index + 1}</span>
                                          </div>
                                        </td>
                                        <td className="px-1.5 py-2 align-top">
                                          <Input
                                            value={detail.pono}
                                            onChange={(event) =>
                                              updateDetail(detail.id, {
                                                pono: event.target.value,
                                              })
                                            }
                                            placeholder="Input PO number"
                                            className={
                                              JOB_DIALOG_TABLE_INPUT_CLASS
                                            }
                                          />
                                        </td>
                                        <td className="px-1.5 py-2 align-top">
                                          <AppCombobox
                                            open={
                                              openRowControl ===
                                              `${detail.id}:style`
                                            }
                                            onOpenChange={(open) =>
                                              setOpenRowControl(
                                                open ? `${detail.id}:style` : ""
                                              )
                                            }
                                            value={
                                              detail.styleId
                                                ? {
                                                    value: detail.styleId,
                                                    label:
                                                      detail.styleLabel ||
                                                      detail.styleId,
                                                  }
                                                : null
                                            }
                                            onValueChange={(option) => {
                                              updateDetail(detail.id, {
                                                styleId: option?.value ?? "",
                                                styleLabel: option?.label ?? "",
                                              })
                                              setOpenRowControl("")
                                            }}
                                            loadItems={loadStyleOptions}
                                            placeholder="Search style"
                                            showClear={Boolean(detail.styleId)}
                                            inputClassName={
                                              JOB_DIALOG_TABLE_INPUT_CLASS
                                            }
                                            contentClassName="rounded-lg"
                                          />
                                        </td>
                                        <td className="px-1.5 py-2 align-top">
                                          <AppCombobox
                                            open={
                                              openRowControl ===
                                              `${detail.id}:size`
                                            }
                                            onOpenChange={(open) =>
                                              setOpenRowControl(
                                                open ? `${detail.id}:size` : ""
                                              )
                                            }
                                            value={
                                              detail.sizeId
                                                ? {
                                                    value: detail.sizeId,
                                                    label: detail.sizeLabel,
                                                  }
                                                : null
                                            }
                                            onValueChange={(option) => {
                                              updateDetail(detail.id, {
                                                sizeId: option?.value ?? "",
                                                sizeLabel: option?.label ?? "",
                                              })
                                              setOpenRowControl("")
                                            }}
                                            loadItems={loadSizeOptions}
                                            placeholder="Search size"
                                            showClear={Boolean(detail.sizeId)}
                                            inputClassName={
                                              JOB_DIALOG_TABLE_INPUT_CLASS
                                            }
                                            contentClassName="rounded-lg"
                                          />
                                        </td>
                                        <td className="px-1.5 py-2 align-top">
                                          <AppCombobox
                                            open={
                                              openRowControl ===
                                              `${detail.id}:color`
                                            }
                                            onOpenChange={(open) =>
                                              setOpenRowControl(
                                                open ? `${detail.id}:color` : ""
                                              )
                                            }
                                            value={
                                              detail.colorId
                                                ? {
                                                    value: detail.colorId,
                                                    label: detail.colorLabel,
                                                  }
                                                : null
                                            }
                                            onValueChange={(option) => {
                                              updateDetail(detail.id, {
                                                colorId: option?.value ?? "",
                                                colorLabel: option?.label ?? "",
                                              })
                                              setOpenRowControl("")
                                            }}
                                            loadItems={loadColorOptions}
                                            placeholder="Search color"
                                            showClear={Boolean(detail.colorId)}
                                            inputClassName={
                                              JOB_DIALOG_TABLE_INPUT_CLASS
                                            }
                                            contentClassName="rounded-lg"
                                          />
                                        </td>
                                        <td className="w-16 min-w-16 px-1.5 py-2 align-top">
                                          <Input
                                            value={hideZeroValue(
                                              detail.quantity
                                            )}
                                            onChange={(event) =>
                                              updateDetail(detail.id, {
                                                quantity: event.target.value,
                                              })
                                            }
                                            onKeyDown={(event) =>
                                              handleDetailFieldKeyDown(
                                                event,
                                                index,
                                                "quantity"
                                              )
                                            }
                                            inputMode="decimal"
                                            placeholder="Quantity"
                                            className={cn(
                                              JOB_DIALOG_TABLE_INPUT_CLASS,
                                              "min-w-16"
                                            )}
                                            data-job-detail-quantity={detail.id}
                                          />
                                        </td>
                                        <td className="w-16 min-w-16 px-1.5 py-2 align-top">
                                          <Input
                                            value={hideZeroValue(detail.fob)}
                                            onChange={(event) =>
                                              updateDetailFromRow(index, {
                                                fob: event.target.value,
                                              })
                                            }
                                            onKeyDown={(event) =>
                                              handleDetailFieldKeyDown(
                                                event,
                                                index,
                                                "fob"
                                              )
                                            }
                                            inputMode="decimal"
                                            placeholder="FOB"
                                            className={cn(
                                              JOB_DIALOG_TABLE_INPUT_CLASS,
                                              "min-w-16"
                                            )}
                                            data-job-detail-fob={detail.id}
                                          />
                                        </td>
                                        <td className="px-1.5 py-2 align-top">
                                          <Input
                                            value={hideZeroValue(
                                              calculateTotalFob(
                                                detail.quantity,
                                                detail.fob
                                              )
                                            )}
                                            readOnly
                                            placeholder="Total FOB"
                                            className={
                                              JOB_DIALOG_TABLE_INPUT_CLASS
                                            }
                                          />
                                        </td>
                                        <td className="px-1.5 py-2 align-top">
                                          <Input
                                            value={hideZeroValue(detail.cm)}
                                            onChange={(event) =>
                                              updateDetailFromRow(index, {
                                                cm: event.target.value,
                                              })
                                            }
                                            onKeyDown={(event) =>
                                              handleDetailFieldKeyDown(
                                                event,
                                                index,
                                                "cm"
                                              )
                                            }
                                            inputMode="decimal"
                                            placeholder="CM/Dzn"
                                            className={
                                              JOB_DIALOG_TABLE_INPUT_CLASS
                                            }
                                            data-job-detail-cm={detail.id}
                                          />
                                        </td>
                                        <td className="px-1.5 py-2 align-top">
                                          <Input
                                            type="date"
                                            value={detail.deliveryDate}
                                            onChange={(event) =>
                                              updateDetailFromRow(index, {
                                                deliveryDate:
                                                  event.target.value,
                                              })
                                            }
                                            onKeyDown={(event) =>
                                              handleDetailFieldKeyDown(
                                                event,
                                                index,
                                                "deliveryDate"
                                              )
                                            }
                                            className={
                                              JOB_DIALOG_TABLE_INPUT_CLASS
                                            }
                                            data-job-detail-deliverydate={
                                              detail.id
                                            }
                                          />
                                        </td>
                                        <td className="px-1.5 py-2 align-top">
                                          <Input
                                            value={
                                              hideZeroValue(
                                                detail.cuttingLimitPercentage
                                              )
                                            }
                                            onChange={(event) =>
                                              updateDetailFromRow(index, {
                                                cuttingLimitPercentage:
                                                  event.target.value,
                                              })
                                            }
                                            onKeyDown={(event) =>
                                              handleDetailFieldKeyDown(
                                                event,
                                                index,
                                                "cuttingLimitPercentage"
                                              )
                                            }
                                            inputMode="decimal"
                                            placeholder="Cutting Limit %"
                                            className={
                                              JOB_DIALOG_TABLE_INPUT_CLASS
                                            }
                                            data-job-detail-cutting-limit-percentage={
                                              detail.id
                                            }
                                          />
                                        </td>
                                        <td className="px-1.5 py-2 align-top">
                                          <Input
                                            type="text"
                                            value={detail.remarks}
                                            onChange={(event) =>
                                              updateDetail(detail.id, {
                                                remarks: event.target.value,
                                              })
                                            }
                                            onKeyDown={(event) =>
                                              handleDetailFieldKeyDown(
                                                event,
                                                index,
                                                "remarks"
                                              )
                                            }
                                            placeholder="Remarks"
                                            className={
                                              JOB_DIALOG_TABLE_INPUT_CLASS
                                            }
                                            data-job-detail-remarks={detail.id}
                                          />
                                        </td>
                                        <td className="px-1.5 py-2 text-right align-top">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-7 rounded-md text-red-500 hover:text-red-600"
                                            onClick={() =>
                                              removeDetail(detail.id)
                                            }
                                          >
                                            <Trash2 className="size-3.5" />
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Total Quantity:
                                </Label>
                                <span className="font-medium text-slate-900 dark:text-white">
                                  {totalQuantitySummary}
                                </span>
                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Total FOB:
                                </Label>
                                <span className="font-medium text-slate-900 dark:text-white">
                                  {totalFobSummary}
                                </span>
                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Total CM:
                                </Label>
                                <span className="font-medium text-slate-900 dark:text-white">
                                  {totalCmSummary}
                                </span>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      <Card
                        ref={(element) => {
                          sectionRefs.current.status = element
                        }}
                        id="status"
                        className="max-w-full min-w-0 scroll-mt-3 overflow-hidden rounded-lg border-slate-200/70 bg-white/75 shadow-none dark:border-white/10 dark:bg-[#17131d]/80"
                      >
                        <CardHeader className="px-4 pt-3 pb-2">
                          <CardTitle className="text-sm">Status</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 sm:px-4">
                          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium">Active</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Active purchase orders are available in
                                  merchandising flows.
                                </p>
                              </div>
                              <Switch
                                checked={values.isActive}
                                onCheckedChange={(checked) =>
                                  update("isActive", checked)
                                }
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="border-t border-slate-200/70 bg-white/80 px-3 py-3 sm:px-4 dark:border-white/10 dark:bg-[#0a0d19]/95">
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || submitting}
                className="rounded-xl"
              >
                {submitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                {mode === "create" ? "Save Job Entry" : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
      <JobAiAssistDialog
        tableInputClassName={JOB_DIALOG_TABLE_INPUT_CLASS}
        onFileChange={handleAiAssistFileChange}
        onAnalyze={() => void analyzeAiAssistFile()}
        onAddRow={(row, index) => void addAiAssistRowToDetails(row, index)}
        onFieldKeyDown={handleAiAssistFieldKeyDown}
        onFillDown={() => fillAiAssistColumnDown()}
        onFormatDateForInput={formatAiAssistDateForInput}
      />
      <JobPoSummaryDialog
        open={poSummaryOpen}
        onOpenChange={setPoSummaryOpen}
        loadRecentPoOptions={loadRecentPoOptions}
        onSearch={onPoSummarySearch}
      />
    </Dialog>
  )
}
