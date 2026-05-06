"use client"

import { useRef, useState, type DragEvent } from "react"
import { GripVertical, Info, Loader2, PackageCheck, Plus, Settings, Trash2 } from "lucide-react"

import { AppCombobox, type AppComboboxLoadParams, type AppComboboxOption } from "@/components/app-combobox"
import { AppSelect } from "@/components/app-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type { JobDetailFormValues, JobDialogSectionId, JobFormError, JobFormValues } from "../job.types"

type SelectOption = AppComboboxOption

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
const JOB_DIALOG_TABLE_INPUT_CLASS = "h-7 rounded-md text-xs"

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

function newDetailRow(): JobDetailFormValues {
  return {
    id: crypto.randomUUID(),
    pono: "",
    styleId: "",
    styleLabel: "",
    sizeId: "",
    sizeLabel: "",
    colorId: "",
    colorLabel: "",
    quantity: "0",
    fob: "0",
    cm: "0",
    deliveryDate: "",
    remarks: "",
  }
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
  onOpenChange,
  onSubmit,
}: JobFormDialogProps) {
  const [factoryOpen, setFactoryOpen] = useState(false)
  const [buyerOpen, setBuyerOpen] = useState(false)
  const [employeeOpen, setEmployeeOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<JobDialogSectionId>("basic-info")
  const [openRowControl, setOpenRowControl] = useState("")
  const [draggingDetailId, setDraggingDetailId] = useState("")
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

  function addDetail() {
    update("jobDetails", [...values.jobDetails, newDetailRow()])
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

  function focusNextQuantityInput(currentIndex: number) {
    const nextDetail = values.jobDetails[currentIndex + 1]

    if (!nextDetail) {
      return
    }

    window.requestAnimationFrame(() => {
      const nextInput = document.querySelector<HTMLInputElement>(`[data-job-detail-quantity="${nextDetail.id}"]`)
      nextInput?.focus()
      nextInput?.select()
    })
  }

  function handleQuantityKeyDown(event: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) {
    if (event.key !== "Enter") {
      return
    }

    event.preventDefault()
    focusNextQuantityInput(currentIndex)
  }

  function scrollToSection(sectionId: JobDialogSectionId) {
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" })
    setActiveSection(sectionId)
  }

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
                  <DialogTitle>{mode === "create" ? "Create purchase order" : "Edit purchase order"}</DialogTitle>
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
                          <Button type="button" variant="outline" size="sm" className="h-8 w-full rounded-md border-blue-500/60 px-2 text-xs text-blue-600 dark:text-blue-300 sm:h-7 sm:w-auto" onClick={addDetail}>
                            <Plus className="size-3.5" />
                            Add row
                          </Button>
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
                                        value={detail.styleId ? { value: detail.styleId, label: detail.styleLabel } : null}
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
                                      onKeyDown={(event) => handleQuantityKeyDown(event, index)}
                                      inputMode="decimal"
                                      placeholder="Quantity"
                                      data-job-detail-quantity={detail.id}
                                    />
                                    <Input className={JOB_DIALOG_INPUT_CLASS} value={detail.fob} onChange={(event) => updateDetail(detail.id, { fob: event.target.value })} inputMode="decimal" placeholder="FOB" />
                                    <Input className={JOB_DIALOG_INPUT_CLASS} value={detail.cm} onChange={(event) => updateDetail(detail.id, { cm: event.target.value })} inputMode="decimal" placeholder="CM" />
                                    <Input className={JOB_DIALOG_INPUT_CLASS} type="date" value={detail.deliveryDate} onChange={(event) => updateDetail(detail.id, { deliveryDate: event.target.value })} />
                                    <Textarea className="w-full min-w-0 rounded-md text-sm md:col-span-2 xl:col-span-4" value={detail.remarks} onChange={(event) => updateDetail(detail.id, { remarks: event.target.value })} placeholder="Remarks" rows={2} />
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="hidden w-full min-w-0 overflow-x-scroll rounded-md border border-slate-200/70 overscroll-x-contain pb-2 [scrollbar-gutter:stable] lg:block dark:border-white/10">
                              <table className="w-max min-w-[1700px] border-collapse text-xs">
                                <thead>
                                  <tr className="h-9 border-b hover:bg-transparent">
                                    <th className="w-14 whitespace-nowrap px-2 py-2 text-left font-medium text-foreground">#</th>
                                    <th className="min-w-52 whitespace-nowrap px-2 py-2 text-left font-medium text-foreground">PO Number</th>
                                    <th className="min-w-60 whitespace-nowrap px-2 py-2 text-left font-medium text-foreground">Style</th>
                                    <th className="min-w-56 whitespace-nowrap px-2 py-2 text-left font-medium text-foreground">Size</th>
                                    <th className="min-w-56 whitespace-nowrap px-2 py-2 text-left font-medium text-foreground">Color</th>
                                    <th className="min-w-32 whitespace-nowrap px-2 py-2 text-left font-medium text-foreground">Quantity</th>
                                    <th className="min-w-28 whitespace-nowrap px-2 py-2 text-left font-medium text-foreground">FOB</th>
                                    <th className="min-w-28 whitespace-nowrap px-2 py-2 text-left font-medium text-foreground">CM</th>
                                    <th className="min-w-40 whitespace-nowrap px-2 py-2 text-left font-medium text-foreground">Delivery Date</th>
                                    <th className="min-w-72 whitespace-nowrap px-2 py-2 text-left font-medium text-foreground">Remarks</th>
                                    <th className="w-16 whitespace-nowrap px-2 py-2 text-right font-medium text-foreground">Action</th>
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
                                      <td className="whitespace-nowrap px-2 py-2 align-top text-xs">
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
                                      <td className="px-2 py-2 align-top">
                                        <Input
                                          value={detail.pono}
                                          onChange={(event) => updateDetail(detail.id, { pono: event.target.value })}
                                          placeholder="Input PO number"
                                          className={JOB_DIALOG_TABLE_INPUT_CLASS}
                                        />
                                      </td>
                                      <td className="px-2 py-2 align-top">
                                        <AppCombobox
                                          open={openRowControl === `${detail.id}:style`}
                                          onOpenChange={(open) => setOpenRowControl(open ? `${detail.id}:style` : "")}
                                          value={detail.styleId ? { value: detail.styleId, label: detail.styleLabel } : null}
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
                                      <td className="px-2 py-2 align-top">
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
                                      <td className="px-2 py-2 align-top">
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
                                      <td className="px-2 py-2 align-top">
                                        <Input
                                          value={detail.quantity}
                                          onChange={(event) => updateDetail(detail.id, { quantity: event.target.value })}
                                          onKeyDown={(event) => handleQuantityKeyDown(event, index)}
                                          inputMode="decimal"
                                          placeholder="Quantity"
                                          className={JOB_DIALOG_TABLE_INPUT_CLASS}
                                          data-job-detail-quantity={detail.id}
                                        />
                                      </td>
                                      <td className="px-2 py-2 align-top">
                                        <Input
                                          value={detail.fob}
                                          onChange={(event) => updateDetail(detail.id, { fob: event.target.value })}
                                          inputMode="decimal"
                                          placeholder="FOB"
                                          className={JOB_DIALOG_TABLE_INPUT_CLASS}
                                        />
                                      </td>
                                      <td className="px-2 py-2 align-top">
                                        <Input
                                          value={detail.cm}
                                          onChange={(event) => updateDetail(detail.id, { cm: event.target.value })}
                                          inputMode="decimal"
                                          placeholder="CM"
                                          className={JOB_DIALOG_TABLE_INPUT_CLASS}
                                        />
                                      </td>
                                      <td className="px-2 py-2 align-top">
                                        <Input
                                          type="date"
                                          value={detail.deliveryDate}
                                          onChange={(event) => updateDetail(detail.id, { deliveryDate: event.target.value })}
                                          className={JOB_DIALOG_TABLE_INPUT_CLASS}
                                        />
                                      </td>
                                      <td className="px-2 py-2 align-top">
                                        <Input
                                          type="text"
                                          value={detail.remarks}
                                          onChange={(event) => updateDetail(detail.id, { remarks: event.target.value })}
                                          placeholder="Remarks"
                                          className={JOB_DIALOG_TABLE_INPUT_CLASS}
                                        />
                                      </td>
                                      <td className="px-2 py-2 align-top text-right">
                                        <Button type="button" variant="ghost" size="icon" className="size-7 rounded-md text-red-500 hover:text-red-600" onClick={() => removeDetail(detail.id)}>
                                          <Trash2 className="size-3.5" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
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
                {mode === "create" ? "Save Purchase Order" : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
