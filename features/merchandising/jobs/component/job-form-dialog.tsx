"use client"

import { useRef, useState, type DragEvent } from "react"
import { GripVertical, Info, Loader2, PackageCheck, Plus, Settings, Sparkles, Trash2, Upload } from "lucide-react"

import { AppCombobox, type AppComboboxLoadParams, type AppComboboxOption } from "@/components/app-combobox"
import { AppSelect } from "@/components/app-select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type { JobAiAssistRow, JobDetailFormValues, JobDialogSectionId, JobFormError, JobFormValues } from "../job.types"

type SelectOption = AppComboboxOption

type AiAssistMasterDataMatches = {
  styleOption: SelectOption | null
  sizeOption: SelectOption | null
  colorOption: SelectOption | null
}

type AiAssistMissingMasterData = {
  styleNo?: string
  size?: string
  color?: string
}

type AiAssistPendingAdd = {
  row: JobAiAssistRow
  index: number
  matches: AiAssistMasterDataMatches
  missing: AiAssistMissingMasterData
}

type JobFormDialogProps = {
  open: boolean
  mode: "create" | "edit"
  loading: boolean
  submitting: boolean
  values: JobFormValues
  errors: JobFormError[]
  selectedFactory: SelectOption | null
  selectedBuyer: SelectOption | null
  selectedMerchandiser: SelectOption | null
  loadFactoryOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadEmployeeOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadStyleOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadSizeOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadColorOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  onFactoryOptionChange: (option: SelectOption | null) => void
  onBuyerOptionChange: (option: SelectOption | null) => void
  onMerchandiserOptionChange: (option: SelectOption | null) => void
  onValuesChange: (values: JobFormValues) => void
  onAiAssistFileAnalyze: (file: File) => Promise<JobAiAssistRow[]>
  onAiAssistMasterDataCreate: (params: {
    row: JobAiAssistRow
    missing: AiAssistMissingMasterData
    matches: AiAssistMasterDataMatches
  }) => Promise<Partial<AiAssistMasterDataMatches>>
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
const JOB_DIALOG_TABLE_INPUT_CLASS = "h-7 rounded-md px-1.5 text-xs"
const DETAIL_FOCUS_COLUMNS = ["quantity", "fob", "cm", "deliveryDate", "remarks"] as const

type DetailFocusColumn = (typeof DETAIL_FOCUS_COLUMNS)[number]

const JOB_DIALOG_SECTIONS: Array<{ id: JobDialogSectionId; label: string; icon: typeof Info }> = [
  { id: "basic-info", label: "Basic Info", icon: Info },
  { id: "details", label: "PO Details", icon: PackageCheck },
  { id: "status", label: "Status", icon: Settings },
]

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  )
}

function newDetailRow(previousDetail?: Partial<JobDetailFormValues>): JobDetailFormValues {
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
    remarks: "",
  }
}

function calculateTotalFob(quantity: string | number | null | undefined, fob: string | number | null | undefined) {
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

function sumJobDetails<T extends { quantity?: string | number | null; fob?: string | number | null; cm?: string | number | null }>(
  details: T[],
  valueKey: "fob" | "cm",
) {
  return details.reduce((total, detail) => {
    const quantityValue = Number(detail.quantity)
    const unitValue = Number(detail[valueKey])

    if (!Number.isFinite(quantityValue) || !Number.isFinite(unitValue)) {
      return total
    }

    return total + quantityValue * unitValue
  }, 0)
}

function sumJobQuantities<T extends { quantity?: string | number | null }>(details: T[]) {
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

function normalizeLookupText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function findBestAiAssistOption(options: SelectOption[], value: string, allowStylePrefix = false) {
  const normalizedValue = normalizeLookupText(value)

  if (!normalizedValue) {
    return null
  }

  return (
    options.find((option) => normalizeLookupText(option.label) === normalizedValue || normalizeLookupText(option.value) === normalizedValue) ??
    (allowStylePrefix ? options.find((option) => normalizeLookupText(option.label).startsWith(`${normalizedValue} -`)) : undefined) ??
    null
  )
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
  const parts = normalizedValue.toLowerCase().split(/[\s\-/.]+/).filter(Boolean)

  if (parts.length >= 3) {
    const [dayPart, monthPart, yearPart] = parts
    const day = Number(dayPart)
    const month = monthMap[monthPart] ?? (Number(monthPart) >= 1 && Number(monthPart) <= 12 ? String(Number(monthPart)).padStart(2, "0") : "")
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
        "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-slate-600 outline-none transition-colors dark:text-slate-300",
        active ? "border-l-2 border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300" : "hover:bg-slate-900/5 dark:hover:bg-white/[0.04]",
        hasError && !active ? "text-red-600 dark:text-red-300" : "",
      )}
    >
      <Icon className="size-4" />
      <span className="min-w-0 flex-1 truncate">{section.label}</span>
      {hasError ? <span className="size-2 rounded-full bg-red-500" /> : null}
      {typeof count === "number" ? (
        <Badge className="rounded-md bg-blue-600/15 px-2 py-0 text-xs text-blue-700 hover:bg-blue-600/15 dark:text-blue-200">{count}</Badge>
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
  onAiAssistMasterDataCreate,
  onOpenChange,
  onSubmit,
}: JobFormDialogProps) {
  const [factoryOpen, setFactoryOpen] = useState(false)
  const [buyerOpen, setBuyerOpen] = useState(false)
  const [employeeOpen, setEmployeeOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<JobDialogSectionId>("basic-info")
  const [openRowControl, setOpenRowControl] = useState("")
  const [draggingDetailId, setDraggingDetailId] = useState("")
  const [aiAssistOpen, setAiAssistOpen] = useState(false)
  const [aiAssistFile, setAiAssistFile] = useState<File | null>(null)
  const [aiAssistFileName, setAiAssistFileName] = useState("")
  const [aiAssistRows, setAiAssistRows] = useState<JobAiAssistRow[]>([])
  const [aiAssistError, setAiAssistError] = useState("")
  const [aiAssistWorking, setAiAssistWorking] = useState(false)
  const [addingAiAssistRowIndex, setAddingAiAssistRowIndex] = useState<number | null>(null)
  const [addedAiAssistRowKeys, setAddedAiAssistRowKeys] = useState<string[]>([])
  const [pendingAiAssistAdd, setPendingAiAssistAdd] = useState<AiAssistPendingAdd | null>(null)
  const sectionRefs = useRef<Record<JobDialogSectionId, HTMLElement | null>>({
    "basic-info": null,
    details: null,
    status: null,
  })
  const errorSectionSet = new Set(errors.map((error) => error.section))

  function update<K extends keyof JobFormValues>(field: K, value: JobFormValues[K]) {
    onValuesChange({ ...values, [field]: value })
  }

  function updateDetail(id: string, patch: Partial<JobDetailFormValues>) {
    update(
      "jobDetails",
      values.jobDetails.map((detail) => (detail.id === id ? { ...detail, ...patch } : detail)),
    )
  }

  function updateDetailFromRow(index: number, patch: Partial<JobDetailFormValues>) {
    update(
      "jobDetails",
      values.jobDetails.map((detail, detailIndex) => (detailIndex >= index ? { ...detail, ...patch } : detail)),
    )
  }

  function addDetail() {
    const previousDetail = values.jobDetails[values.jobDetails.length - 1]
    update("jobDetails", [...values.jobDetails, newDetailRow(previousDetail)])
  }

  function handleAiAssistFileChange(file: File | null) {
    setAiAssistFile(file)
    setAiAssistFileName(file?.name ?? "")
    setAiAssistRows([])
    setAiAssistError("")
    setAddedAiAssistRowKeys([])

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
      setAiAssistRows(rows)
      setAddedAiAssistRowKeys([])
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to analyze this file right now."
      setAiAssistRows([])
      setAiAssistError(message)
    } finally {
      setAiAssistWorking(false)
    }
  }

  function getAiAssistRowKey(row: JobAiAssistRow, index: number) {
    return [row.poNumber, row.styleNo, row.color, row.size, row.quantity, row.fob ?? "", row.deliveryDate ?? "", index].join(":")
  }

  function appendAiAssistRowToDetails(row: JobAiAssistRow, index: number, matches: AiAssistMasterDataMatches) {
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
    }

    update("jobDetails", [...values.jobDetails, nextDetail])
    setAddedAiAssistRowKeys((currentKeys) => [...currentKeys, getAiAssistRowKey(row, index)])
  }

  async function addAiAssistRowToDetails(row: JobAiAssistRow, index: number) {
    if (addingAiAssistRowIndex !== null) {
      return
    }

    setAddingAiAssistRowIndex(index)
    setAiAssistError("")

    try {
      const [styleResult, sizeResult, colorResult] = await Promise.all([
        row.styleNo.trim() ? loadStyleOptions({ query: row.styleNo.trim(), page: 1, limit: 10 }) : Promise.resolve({ items: [], hasNextPage: false }),
        row.size.trim() ? loadSizeOptions({ query: row.size.trim(), page: 1, limit: 10 }) : Promise.resolve({ items: [], hasNextPage: false }),
        row.color.trim() ? loadColorOptions({ query: row.color.trim(), page: 1, limit: 10 }) : Promise.resolve({ items: [], hasNextPage: false }),
      ])
      const styleOption = findBestAiAssistOption(styleResult.items, row.styleNo, true)
      const sizeOption = findBestAiAssistOption(sizeResult.items, row.size)
      const colorOption = findBestAiAssistOption(colorResult.items, row.color)
      const matches = { styleOption, sizeOption, colorOption }
      const missing: AiAssistMissingMasterData = {
        styleNo: row.styleNo.trim() && !styleOption ? row.styleNo.trim() : undefined,
        size: row.size.trim() && !sizeOption ? row.size.trim() : undefined,
        color: row.color.trim() && !colorOption ? row.color.trim() : undefined,
      }

      if (missing.styleNo || missing.size || missing.color) {
        setPendingAiAssistAdd({ row, index, matches, missing })
        return
      }

      appendAiAssistRowToDetails(row, index, matches)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to add this AI Assist row to PO Details."
      setAiAssistError(message)
    } finally {
      setAddingAiAssistRowIndex(null)
    }
  }

  async function confirmCreateAiAssistMasterData() {
    if (!pendingAiAssistAdd || addingAiAssistRowIndex !== null) {
      return
    }

    setAddingAiAssistRowIndex(pendingAiAssistAdd.index)
    setAiAssistError("")

    try {
      const createdMatches = await onAiAssistMasterDataCreate({
        row: pendingAiAssistAdd.row,
        missing: pendingAiAssistAdd.missing,
        matches: pendingAiAssistAdd.matches,
      })
      appendAiAssistRowToDetails(pendingAiAssistAdd.row, pendingAiAssistAdd.index, {
        styleOption: createdMatches.styleOption ?? pendingAiAssistAdd.matches.styleOption,
        sizeOption: createdMatches.sizeOption ?? pendingAiAssistAdd.matches.sizeOption,
        colorOption: createdMatches.colorOption ?? pendingAiAssistAdd.matches.colorOption,
      })
      setPendingAiAssistAdd(null)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to create the missing setup data for this AI Assist row."
      setAiAssistError(message)
    } finally {
      setAddingAiAssistRowIndex(null)
    }
  }

  function removeDetail(id: string) {
    update("jobDetails", values.jobDetails.filter((detail) => detail.id !== id))
  }

  function reorderDetail(sourceId: string, targetId: string) {
    if (!sourceId || sourceId === targetId) {
      return
    }

    const sourceIndex = values.jobDetails.findIndex((detail) => detail.id === sourceId)
    const targetIndex = values.jobDetails.findIndex((detail) => detail.id === targetId)

    if (sourceIndex < 0 || targetIndex < 0) {
      return
    }

    const nextDetails = [...values.jobDetails]
    const [movedDetail] = nextDetails.splice(sourceIndex, 1)
    nextDetails.splice(targetIndex, 0, movedDetail)
    update("jobDetails", nextDetails)
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

  function getDetailFocusAttribute(column: DetailFocusColumn) {
    return `data-job-detail-${column}`
  }

  function focusNextDetailField(currentIndex: number, column: DetailFocusColumn) {
    const nextDetail = values.jobDetails[currentIndex + 1]

    if (!nextDetail) {
      return
    }

    window.requestAnimationFrame(() => {
      const attribute = getDetailFocusAttribute(column)
      const nextInput = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[${attribute}="${nextDetail.id}"]`)).find(
        (input) => input.offsetParent !== null,
      )
      nextInput?.focus()
      nextInput?.select()
    })
  }

  function handleDetailFieldKeyDown(event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, currentIndex: number, column: DetailFocusColumn) {
    if (event.key !== "Enter") {
      return
    }

    event.preventDefault()
    focusNextDetailField(currentIndex, column)
  }

  function scrollToSection(sectionId: JobDialogSectionId) {
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" })
    setActiveSection(sectionId)
  }

  const totalFobSummary = formatSummaryValue(sumJobDetails(values.jobDetails, "fob"))
  const totalCmSummary = formatSummaryValue(sumJobDetails(values.jobDetails, "cm"))
  const totalQuantitySummary = formatSummaryValue(sumJobQuantities(values.jobDetails))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-slate-200/70 bg-slate-50 p-0 shadow-2xl dark:border-white/10 dark:bg-[#080a14] sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-7xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
        <form
          className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] sm:max-h-[calc(100vh-2rem)] sm:min-h-[78vh]"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <div className="grid min-h-0 min-w-0 overflow-hidden lg:grid-cols-[230px_minmax(0,1fr)]">
            <aside className="hidden border-r border-slate-200/70 bg-white/55 p-3 dark:border-white/10 dark:bg-[#0a0d19]/90 lg:block">
              <nav className="space-y-2">
                {JOB_DIALOG_SECTIONS.map((section) => (
                  <RailItem
                    key={section.id}
                    section={section}
                    active={activeSection === section.id}
                    count={section.id === "details" ? values.jobDetails.length : undefined}
                    hasError={errorSectionSet.has(section.id)}
                    onClick={() => scrollToSection(section.id)}
                  />
                ))}
              </nav>
            </aside>

            <div className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto">
              <div className="min-w-0 space-y-2.5 p-2 sm:p-3">
                <DialogHeader className="rounded-lg border border-slate-200/70 bg-white/90 p-3 dark:border-white/10 dark:bg-[#17131d]/90">
                  <DialogTitle>{mode === "create" ? "Create job entry" : "Edit job entry"}</DialogTitle>
                  <DialogDescription>
                    Manage order header data and PO detail rows. PO numbers are resolved automatically by the backend.
                  </DialogDescription>
                </DialogHeader>

                {errors.length > 0 ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                    <p className="font-medium">Please fix the following:</p>
                    <ul className="mt-1 space-y-1">
                      {errors.map((error) => (
                        <li key={`${error.section}-${error.message}`}>{error.message}</li>
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
                    <Card ref={(element) => { sectionRefs.current["basic-info"] = element }} id="basic-info" className="min-w-0 scroll-mt-3 overflow-hidden rounded-lg border-slate-200/70 bg-white/75 shadow-none dark:border-white/10 dark:bg-[#17131d]/80">
                      <CardHeader className="px-4 pb-2 pt-3">
                        <CardTitle className="text-sm">Basic Info</CardTitle>
                      </CardHeader>
                      <CardContent className="grid min-w-0 gap-4 px-3 pb-3 sm:px-4 md:grid-cols-2 xl:grid-cols-3">
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
                            onValueChange={(value) => update("ordertype", value === "none" ? "" : value)}
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
                          <Input className={JOB_DIALOG_INPUT_CLASS} type="date" value={values.poReceiveDate} onChange={(event) => update("poReceiveDate", event.target.value)} />
                        </div>
                        <div className={JOB_DIALOG_FIELD_CLASS}>
                          <FieldLabel>Total PO Qty</FieldLabel>
                          <Input value={values.totalPoQty} readOnly className="w-full min-w-0 bg-slate-100 dark:bg-white/[0.04]" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card ref={(element) => { sectionRefs.current.details = element }} id="details" className="min-w-0 scroll-mt-3 overflow-hidden rounded-lg border-slate-200/70 bg-white/75 shadow-none dark:border-white/10 dark:bg-[#17131d]/80">
                      <CardHeader className="border-b border-slate-200/70 px-4 py-2.5 dark:border-white/10">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <CardTitle className="text-sm">PO Details</CardTitle>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button type="button" variant="outline" size="sm" className="h-8 w-full rounded-md border-blue-500/60 px-2 text-xs text-blue-600 dark:text-blue-300 sm:h-7 sm:w-auto" onClick={() => setAiAssistOpen(true)}>
                              <Sparkles className="size-3.5" />
                              AI Assist
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="h-8 w-full rounded-md border-blue-500/60 px-2 text-xs text-blue-600 dark:text-blue-300 sm:h-7 sm:w-auto" onClick={addDetail}>
                              <Plus className="size-3.5" />
                              Add row
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="min-w-0 space-y-3 p-3">
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
                                  onDrop={(event) => handleDetailDrop(event, detail.id)}
                                  className={cn(
                                    "rounded-md border border-slate-200/70 bg-white/60 p-3 transition-opacity dark:border-white/10 dark:bg-slate-950/40",
                                    draggingDetailId === detail.id ? "opacity-60" : "",
                                  )}
                                >
                                  <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        draggable
                                        onDragStart={(event) => handleDetailDragStart(event, detail.id)}
                                        onDragEnd={() => setDraggingDetailId("")}
                                        className="flex size-7 cursor-grab items-center justify-center rounded-md text-slate-400 active:cursor-grabbing hover:bg-slate-900/5 hover:text-slate-600 dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
                                        aria-label={`Drag row ${index + 1}`}
                                      >
                                        <GripVertical className="size-4" />
                                      </button>
                                      <Badge variant="secondary" className="rounded-md">Row {index + 1}</Badge>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="size-7 rounded-md text-red-500 hover:text-red-600" onClick={() => removeDetail(detail.id)}>
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>
                                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <div className={JOB_DIALOG_FIELD_CLASS}>
                                      <FieldLabel required>PO Number</FieldLabel>
                                      <Input className={JOB_DIALOG_INPUT_CLASS} value={detail.pono} onChange={(event) => updateDetail(detail.id, { pono: event.target.value })} placeholder="Input PO number" />
                                    </div>
                                    <div className={JOB_DIALOG_FIELD_CLASS}>
                                      <FieldLabel required>Style</FieldLabel>
                                      <AppCombobox
                                        open={openRowControl === `${detail.id}:style`}
                                        onOpenChange={(open) => setOpenRowControl(open ? `${detail.id}:style` : "")}
                                        value={detail.styleId ? { value: detail.styleId, label: detail.styleLabel || detail.styleId } : null}
                                        onValueChange={(option) => {
                                          updateDetail(detail.id, { styleId: option?.value ?? "", styleLabel: option?.label ?? "" })
                                          setOpenRowControl("")
                                        }}
                                        loadItems={loadStyleOptions}
                                        placeholder="Search style"
                                        showClear={Boolean(detail.styleId)}
                                        inputClassName={JOB_DIALOG_INPUT_CLASS}
                                        contentClassName="rounded-lg"
                                      />
                                    </div>
                                    <div className={JOB_DIALOG_FIELD_CLASS}>
                                      <FieldLabel required>Size</FieldLabel>
                                      <AppCombobox
                                        open={openRowControl === `${detail.id}:size`}
                                        onOpenChange={(open) => setOpenRowControl(open ? `${detail.id}:size` : "")}
                                        value={detail.sizeId ? { value: detail.sizeId, label: detail.sizeLabel } : null}
                                        onValueChange={(option) => {
                                          updateDetail(detail.id, { sizeId: option?.value ?? "", sizeLabel: option?.label ?? "" })
                                          setOpenRowControl("")
                                        }}
                                        loadItems={loadSizeOptions}
                                        placeholder="Search size"
                                        showClear={Boolean(detail.sizeId)}
                                        inputClassName={JOB_DIALOG_INPUT_CLASS}
                                        contentClassName="rounded-lg"
                                      />
                                    </div>
                                    <div className={JOB_DIALOG_FIELD_CLASS}>
                                      <FieldLabel required>Color</FieldLabel>
                                      <AppCombobox
                                        open={openRowControl === `${detail.id}:color`}
                                        onOpenChange={(open) => setOpenRowControl(open ? `${detail.id}:color` : "")}
                                        value={detail.colorId ? { value: detail.colorId, label: detail.colorLabel } : null}
                                        onValueChange={(option) => {
                                          updateDetail(detail.id, { colorId: option?.value ?? "", colorLabel: option?.label ?? "" })
                                          setOpenRowControl("")
                                        }}
                                        loadItems={loadColorOptions}
                                        placeholder="Search color"
                                        showClear={Boolean(detail.colorId)}
                                        inputClassName={JOB_DIALOG_INPUT_CLASS}
                                        contentClassName="rounded-lg"
                                      />
                                    </div>
                                    <Input
                                      className={JOB_DIALOG_INPUT_CLASS}
                                      value={detail.quantity}
                                      onChange={(event) => updateDetail(detail.id, { quantity: event.target.value })}
                                      onKeyDown={(event) => handleDetailFieldKeyDown(event, index, "quantity")}
                                      inputMode="decimal"
                                      placeholder="Quantity"
                                      data-job-detail-quantity={detail.id}
                                    />
                                    <Input
                                      className={JOB_DIALOG_INPUT_CLASS}
                                      value={detail.fob}
                                      onChange={(event) => updateDetailFromRow(index, { fob: event.target.value })}
                                      onKeyDown={(event) => handleDetailFieldKeyDown(event, index, "fob")}
                                      inputMode="decimal"
                                      placeholder="FOB"
                                      data-job-detail-fob={detail.id}
                                    />
                                    <Input
                                      className={JOB_DIALOG_INPUT_CLASS}
                                      value={calculateTotalFob(detail.quantity, detail.fob)}
                                      readOnly
                                      placeholder="Total FOB"
                                    />
                                    <Input
                                      className={JOB_DIALOG_INPUT_CLASS}
                                      value={detail.cm}
                                      onChange={(event) => updateDetailFromRow(index, { cm: event.target.value })}
                                      onKeyDown={(event) => handleDetailFieldKeyDown(event, index, "cm")}
                                      inputMode="decimal"
                                      placeholder="CM"
                                      data-job-detail-cm={detail.id}
                                    />
                                    <Input
                                      className={JOB_DIALOG_INPUT_CLASS}
                                      type="date"
                                      value={detail.deliveryDate}
                                      onChange={(event) => updateDetailFromRow(index, { deliveryDate: event.target.value })}
                                      onKeyDown={(event) => handleDetailFieldKeyDown(event, index, "deliveryDate")}
                                      data-job-detail-deliverydate={detail.id}
                                    />
                                    <Textarea
                                      className="w-full min-w-0 rounded-md text-sm md:col-span-2 xl:col-span-4"
                                      value={detail.remarks}
                                      onChange={(event) => updateDetail(detail.id, { remarks: event.target.value })}
                                      onKeyDown={(event) => handleDetailFieldKeyDown(event, index, "remarks")}
                                      placeholder="Remarks"
                                      rows={2}
                                      data-job-detail-remarks={detail.id}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="hidden w-full min-w-0 overflow-x-scroll rounded-md border border-slate-200/70 overscroll-x-contain pb-2 [scrollbar-gutter:stable] lg:block dark:border-white/10">
                              <table className="w-max min-w-[1180px] border-collapse text-xs">
                                <thead>
                                  <tr className="h-9 border-b hover:bg-transparent">
                                    <th className="w-12 whitespace-nowrap px-1.5 py-2 text-left font-medium text-foreground">#</th>
                                    <th className="min-w-44 whitespace-nowrap px-1.5 py-2 text-left font-medium text-foreground">PO Number</th>
                                    <th className="min-w-48 whitespace-nowrap px-1.5 py-2 text-left font-medium text-foreground">Style</th>
                                    <th className="min-w-28 whitespace-nowrap px-1.5 py-2 text-left font-medium text-foreground">Size</th>
                                    <th className="min-w-32 whitespace-nowrap px-1.5 py-2 text-left font-medium text-foreground">Color</th>
                                    <th className="w-20 whitespace-nowrap px-1.5 py-2 text-left font-medium text-foreground">Qty</th>
                                    <th className="w-20 whitespace-nowrap px-1.5 py-2 text-left font-medium text-foreground">FOB</th>
                                    <th className="whitespace-nowrap px-1.5 py-2 text-left font-medium text-foreground">Total FOB</th>
                                    <th className="w-20 whitespace-nowrap px-1.5 py-2 text-left font-medium text-foreground">CM</th>
                                    <th className="min-w-32 whitespace-nowrap px-1.5 py-2 text-left font-medium text-foreground">Delivery</th>
                                    <th className="min-w-56 whitespace-nowrap px-1.5 py-2 text-left font-medium text-foreground">Remarks</th>
                                    <th className="w-12 whitespace-nowrap px-1.5 py-2 text-right font-medium text-foreground">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {values.jobDetails.map((detail, index) => (
                                    <tr
                                      key={detail.id}
                                      onDragOver={handleDetailDragOver}
                                      onDrop={(event) => handleDetailDrop(event, detail.id)}
                                      className={cn(
                                        "border-b align-top transition-colors hover:bg-muted/50",
                                        draggingDetailId === detail.id ? "opacity-60" : "",
                                      )}
                                    >
                                      <td className="whitespace-nowrap px-1.5 py-2 align-top text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            draggable
                                            onDragStart={(event) => handleDetailDragStart(event, detail.id)}
                                            onDragEnd={() => setDraggingDetailId("")}
                                            className="flex size-6 cursor-grab items-center justify-center rounded-md text-slate-400 active:cursor-grabbing hover:bg-slate-900/5 hover:text-slate-600 dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
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
                                          onChange={(event) => updateDetail(detail.id, { pono: event.target.value })}
                                          placeholder="Input PO number"
                                          className={JOB_DIALOG_TABLE_INPUT_CLASS}
                                        />
                                      </td>
                                      <td className="px-1.5 py-2 align-top">
                                        <AppCombobox
                                          open={openRowControl === `${detail.id}:style`}
                                          onOpenChange={(open) => setOpenRowControl(open ? `${detail.id}:style` : "")}
                                          value={detail.styleId ? { value: detail.styleId, label: detail.styleLabel || detail.styleId } : null}
                                          onValueChange={(option) => {
                                            updateDetail(detail.id, { styleId: option?.value ?? "", styleLabel: option?.label ?? "" })
                                            setOpenRowControl("")
                                          }}
                                          loadItems={loadStyleOptions}
                                          placeholder="Search style"
                                          showClear={Boolean(detail.styleId)}
                                          inputClassName={JOB_DIALOG_TABLE_INPUT_CLASS}
                                          contentClassName="rounded-lg"
                                        />
                                      </td>
                                      <td className="px-1.5 py-2 align-top">
                                        <AppCombobox
                                          open={openRowControl === `${detail.id}:size`}
                                          onOpenChange={(open) => setOpenRowControl(open ? `${detail.id}:size` : "")}
                                          value={detail.sizeId ? { value: detail.sizeId, label: detail.sizeLabel } : null}
                                          onValueChange={(option) => {
                                            updateDetail(detail.id, { sizeId: option?.value ?? "", sizeLabel: option?.label ?? "" })
                                            setOpenRowControl("")
                                          }}
                                          loadItems={loadSizeOptions}
                                          placeholder="Search size"
                                          showClear={Boolean(detail.sizeId)}
                                          inputClassName={JOB_DIALOG_TABLE_INPUT_CLASS}
                                          contentClassName="rounded-lg"
                                        />
                                      </td>
                                      <td className="px-1.5 py-2 align-top">
                                        <AppCombobox
                                          open={openRowControl === `${detail.id}:color`}
                                          onOpenChange={(open) => setOpenRowControl(open ? `${detail.id}:color` : "")}
                                          value={detail.colorId ? { value: detail.colorId, label: detail.colorLabel } : null}
                                          onValueChange={(option) => {
                                            updateDetail(detail.id, { colorId: option?.value ?? "", colorLabel: option?.label ?? "" })
                                            setOpenRowControl("")
                                          }}
                                          loadItems={loadColorOptions}
                                          placeholder="Search color"
                                          showClear={Boolean(detail.colorId)}
                                          inputClassName={JOB_DIALOG_TABLE_INPUT_CLASS}
                                          contentClassName="rounded-lg"
                                        />
                                      </td>
                                      <td className="px-1.5 py-2 align-top">
                                        <Input
                                          value={detail.quantity}
                                          onChange={(event) => updateDetail(detail.id, { quantity: event.target.value })}
                                          onKeyDown={(event) => handleDetailFieldKeyDown(event, index, "quantity")}
                                          inputMode="decimal"
                                          placeholder="Quantity"
                                          className={JOB_DIALOG_TABLE_INPUT_CLASS}
                                          data-job-detail-quantity={detail.id}
                                        />
                                      </td>
                                      <td className="px-1.5 py-2 align-top">
                                        <Input
                                          value={detail.fob}
                                          onChange={(event) => updateDetailFromRow(index, { fob: event.target.value })}
                                          onKeyDown={(event) => handleDetailFieldKeyDown(event, index, "fob")}
                                          inputMode="decimal"
                                          placeholder="FOB"
                                          className={JOB_DIALOG_TABLE_INPUT_CLASS}
                                          data-job-detail-fob={detail.id}
                                        />
                                      </td>
                                      <td className="px-1.5 py-2 align-top">
                                        <Input
                                          value={calculateTotalFob(detail.quantity, detail.fob)}
                                          readOnly
                                          placeholder="Total FOB"
                                          className={JOB_DIALOG_TABLE_INPUT_CLASS}
                                        />
                                      </td>
                                      <td className="px-1.5 py-2 align-top">
                                        <Input
                                          value={detail.cm}
                                          onChange={(event) => updateDetailFromRow(index, { cm: event.target.value })}
                                          onKeyDown={(event) => handleDetailFieldKeyDown(event, index, "cm")}
                                          inputMode="decimal"
                                          placeholder="CM"
                                          className={JOB_DIALOG_TABLE_INPUT_CLASS}
                                          data-job-detail-cm={detail.id}
                                        />
                                      </td>
                                      <td className="px-1.5 py-2 align-top">
                                        <Input
                                          type="date"
                                          value={detail.deliveryDate}
                                          onChange={(event) => updateDetailFromRow(index, { deliveryDate: event.target.value })}
                                          onKeyDown={(event) => handleDetailFieldKeyDown(event, index, "deliveryDate")}
                                          className={JOB_DIALOG_TABLE_INPUT_CLASS}
                                          data-job-detail-deliverydate={detail.id}
                                        />
                                      </td>
                                      <td className="px-1.5 py-2 align-top">
                                        <Input
                                          type="text"
                                          value={detail.remarks}
                                          onChange={(event) => updateDetail(detail.id, { remarks: event.target.value })}
                                          onKeyDown={(event) => handleDetailFieldKeyDown(event, index, "remarks")}
                                          placeholder="Remarks"
                                          className={JOB_DIALOG_TABLE_INPUT_CLASS}
                                          data-job-detail-remarks={detail.id}
                                        />
                                      </td>
                                      <td className="px-1.5 py-2 align-top text-right">
                                        <Button type="button" variant="ghost" size="icon" className="size-7 rounded-md text-red-500 hover:text-red-600" onClick={() => removeDetail(detail.id)}>
                                          <Trash2 className="size-3.5" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
                              <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Quantity:</Label>
                              <span className="font-medium text-slate-900 dark:text-white">{totalQuantitySummary}</span>
                              <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total FOB:</Label>
                              <span className="font-medium text-slate-900 dark:text-white">{totalFobSummary}</span>
                              <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total CM:</Label>
                              <span className="font-medium text-slate-900 dark:text-white">{totalCmSummary}</span>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Card ref={(element) => { sectionRefs.current.status = element }} id="status" className="scroll-mt-3 overflow-hidden rounded-lg border-slate-200/70 bg-white/75 shadow-none dark:border-white/10 dark:bg-[#17131d]/80">
                      <CardHeader className="px-4 pb-2 pt-3">
                        <CardTitle className="text-sm">Status</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3 sm:px-4">
                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium">Active</p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Active purchase orders are available in merchandising flows.</p>
                            </div>
                            <Switch checked={values.isActive} onCheckedChange={(checked) => update("isActive", checked)} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200/70 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-[#0a0d19]/95 sm:px-4">
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={loading || submitting} className="rounded-xl">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {mode === "create" ? "Save Job Entry" : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
      <Dialog open={aiAssistOpen} onOpenChange={setAiAssistOpen}>
        <DialogContent className="grid max-h-[88dvh] max-w-[calc(100vw-1.5rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-lg p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
            <DialogTitle>AI Assist</DialogTitle>
            <DialogDescription>Upload a PDF or Excel file. AI Assist will extract PO number, style, color, size, and quantity rows.</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden px-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="job-ai-assist-file">File Upload</Label>
              <label
                htmlFor={aiAssistWorking ? undefined : "job-ai-assist-file"}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-600 transition dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-300",
                  aiAssistWorking ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.06]",
                )}
              >
                {aiAssistWorking ? <Loader2 className="size-5 animate-spin text-blue-500" /> : <Upload className="size-5 text-slate-400" />}
                <span className="max-w-full truncate font-medium">{aiAssistFileName || "Choose a file"}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {aiAssistWorking ? "Upload locked while AI Assist reviews this document" : "PDF, XLS, XLSX, or CSV"}
                </span>
              </label>
              <Input
                id="job-ai-assist-file"
                type="file"
                accept=".pdf,.xls,.xlsx,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                disabled={aiAssistWorking}
                className="sr-only"
                onChange={(event) => handleAiAssistFileChange(event.target.files?.[0] ?? null)}
              />
            </div>

            {aiAssistWorking ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
                <div className="flex items-start gap-2">
                  <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
                  <div>
                    <p className="font-medium">Analyzing purchase order document</p>
                    <p className="mt-0.5 text-xs leading-5 text-blue-700/80 dark:text-blue-100/75">
                      Extracting PO number, style, color, size, quantity, FOB, and delivery date. This may take a moment for large files.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {aiAssistError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {aiAssistError}
              </div>
            ) : null}

            {aiAssistRows.length ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200 dark:border-white/10">
                <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  AI-generated extraction may contain mistakes. Please review the original document and verify all values before saving or making decisions based on this information.
                </div>
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.04]">
                  Extracted PO Detail Rows
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  <table className="w-full min-w-[700px] table-fixed border-collapse text-xs sm:text-sm">
                    <thead className="sticky top-0 z-10 bg-white dark:bg-[#17131d]">
                      <tr className="border-b border-slate-200 dark:border-white/10">
                        <th className="w-20 px-2 py-2 text-left font-medium">PO Number</th>
                        <th className="w-24 px-2 py-2 text-left font-medium">Style No</th>
                        <th className="w-20 px-2 py-2 text-left font-medium">Color</th>
                        <th className="w-14 px-2 py-2 text-left font-medium">Size</th>
                        <th className="w-16 px-2 py-2 text-right font-medium">Qty</th>
                        <th className="w-16 px-2 py-2 text-right font-medium">FOB</th>
                        <th className="w-28 px-2 py-2 text-left font-medium">Delivery Date</th>
                        <th className="w-20 px-2 py-2 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiAssistRows.map((row, index) => {
                        const rowKey = getAiAssistRowKey(row, index)
                        const rowAdded = addedAiAssistRowKeys.includes(rowKey)
                        const rowAdding = addingAiAssistRowIndex === index

                        return (
                          <tr key={rowKey} className="border-b border-slate-100 last:border-b-0 dark:border-white/10">
                            <td className="truncate px-2 py-2 align-top font-medium">{row.poNumber || "-"}</td>
                            <td className="whitespace-normal wrap-break-word px-2 py-2 align-top leading-5">{row.styleNo || "-"}</td>
                            <td className="truncate px-2 py-2 align-top">{row.color || "-"}</td>
                            <td className="px-2 py-2 align-top">{row.size || "-"}</td>
                            <td className="px-2 py-2 text-right align-top font-medium">{row.quantity}</td>
                            <td className="px-2 py-2 text-right align-top">{row.fob ?? "-"}</td>
                            <td className="px-2 py-2 align-top">{row.deliveryDate || "-"}</td>
                            <td className="px-2 py-2 text-right align-top">
                              <Button
                                type="button"
                                size="sm"
                                variant={rowAdded ? "secondary" : "outline"}
                                className="h-6 rounded-md px-3 text-xs"
                                disabled={rowAdding || addingAiAssistRowIndex !== null}
                                onClick={() => void addAiAssistRowToDetails(row, index)}
                              >
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
            <Button type="button" variant="outline" onClick={() => setAiAssistOpen(false)}>Cancel</Button>
            <Button type="button" disabled={!aiAssistFile || aiAssistWorking} onClick={() => void analyzeAiAssistFile()}>
              {aiAssistWorking ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {aiAssistWorking ? "Analyzing" : aiAssistRows.length ? "Analyze Again" : "Analyze"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(pendingAiAssistAdd)} onOpenChange={(open) => {
        if (!open && addingAiAssistRowIndex === null) setPendingAiAssistAdd(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add missing setup data?</AlertDialogTitle>
            <AlertDialogDescription>
              This AI Assist row contains setup values that are not available in the system yet. Add the missing records first, then this row will be inserted into PO Details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingAiAssistAdd ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
              {pendingAiAssistAdd.missing.styleNo ? <p><span className="font-semibold">Style No:</span> {pendingAiAssistAdd.missing.styleNo}</p> : null}
              {pendingAiAssistAdd.missing.color ? <p><span className="font-semibold">Color:</span> {pendingAiAssistAdd.missing.color}</p> : null}
              {pendingAiAssistAdd.missing.size ? <p><span className="font-semibold">Size:</span> {pendingAiAssistAdd.missing.size}</p> : null}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={addingAiAssistRowIndex !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={addingAiAssistRowIndex !== null} onClick={(event) => {
              event.preventDefault()
              void confirmCreateAiAssistMasterData()
            }}>
              {addingAiAssistRowIndex !== null ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Add setup data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
