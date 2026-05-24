"use client"

import type { KeyboardEvent } from "react"
import { useRef, useState } from "react"
import { ClipboardCheck, Info, Loader2, PackageCheck, Settings } from "lucide-react"

import { AppCombobox, type AppComboboxLoadParams, type AppComboboxLoadResult, type AppComboboxOption } from "@/components/app-combobox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

import type { OrderPlacementDetailFormValues, OrderPlacementDialogSectionId, OrderPlacementFormError, OrderPlacementFormValues } from "../order-placement.types"

type SelectOption = AppComboboxOption

type OrderPlacementFormDialogProps = {
  open: boolean
  mode: "create" | "edit"
  loading: boolean
  submitting: boolean
  loadingJobDetails: boolean
  values: OrderPlacementFormValues
  errors: OrderPlacementFormError[]
  selectedBuyer: SelectOption | null
  selectedJob: SelectOption | null
  selectedCurrency: SelectOption | null
  selectedSupplier: SelectOption | null
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<SelectOption>>
  loadJobOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<SelectOption>>
  loadCurrencyOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<SelectOption>>
  loadSupplierOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<SelectOption>>
  onBuyerOptionChange: (option: SelectOption | null) => void
  onJobOptionChange: (option: SelectOption | null) => void
  onCurrencyOptionChange: (option: SelectOption | null) => void
  onSupplierOptionChange: (option: SelectOption | null) => void
  onValuesChange: (values: OrderPlacementFormValues) => void
  onExchangeRateRefresh: (currencyId: string, placementDate: string) => Promise<void>
  onJobDetailsLoad: (jobId: string) => Promise<OrderPlacementDetailFormValues[]>
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
}

const INPUT_CLASS = "h-7 rounded-sm px-1.5 text-xs"
const TABLE_CELL_CLASS = "px-2 py-2 align-top text-xs text-slate-700 dark:text-slate-200"
const FIELD_CLASS = "min-w-0 space-y-2"
const SECTIONS: Array<{ id: OrderPlacementDialogSectionId; label: string; icon: typeof Info }> = [
  { id: "basic-info", label: "Basic Info", icon: Info },
  { id: "details", label: "Placement Details", icon: PackageCheck },
  { id: "status", label: "Status", icon: Settings },
]

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  )
}

function RailItem({
  section,
  active,
  count,
  hasError,
  onClick,
}: {
  section: (typeof SECTIONS)[number]
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
        active ? "border-l-2 border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300" : "hover:bg-slate-900/5 dark:hover:bg-white/[0.04]",
        hasError && !active ? "text-red-600 dark:text-red-300" : "",
      )}
    >
      <Icon className="size-4" />
      <span className="min-w-0 flex-1 truncate">{section.label}</span>
      {hasError ? <span className="size-2 rounded-full bg-red-500" /> : null}
      {typeof count === "number" ? <Badge className="rounded-md bg-blue-600/15 px-2 py-0 text-xs text-blue-700 hover:bg-blue-600/15 dark:text-blue-200">{count}</Badge> : null}
    </button>
  )
}

function hideZeroValue(value: string | number | null | undefined) {
  const stringValue = value == null ? "" : String(value)
  return /^0(?:\.0+)?$/.test(stringValue.trim()) ? "" : stringValue
}

function calculateFactoryCm(quantity: string | number | null | undefined, factoryCmPerDzn: string | number | null | undefined) {
  const quantityValue = Number(quantity)
  const cmValue = Number(factoryCmPerDzn)
  if (!Number.isFinite(quantityValue) || !Number.isFinite(cmValue)) return "0"
  const total = (quantityValue / 12) * cmValue
  return formatNumber(total)
}

function calculateFactoryFob(quantity: string | number | null | undefined, factoryFob: string | number | null | undefined) {
  const quantityValue = Number(quantity)
  const fobValue = Number(factoryFob)
  if (!Number.isFinite(quantityValue) || !Number.isFinite(fobValue)) return "0"
  return formatNumber(quantityValue * fobValue)
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0"
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "")
}

function normalizeExchangeRateInput(value: string) {
  return /^-?\d*\.?\d*$/.test(value) ? value : null
}

function normalizeExchangeRateOnBlur(value: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue > 0 ? value : "1"
}

function sumDetails(details: OrderPlacementDetailFormValues[], key: "quantity" | "totalFactoryCm" | "totalFactoryFob") {
  return details.reduce((total, detail) => {
    const value = Number(detail[key])
    return Number.isFinite(value) ? total + value : total
  }, 0)
}

function sumProfitValue(details: OrderPlacementDetailFormValues[]) {
  return details.reduce((total, detail) => {
    const quantityValue = Number(detail.quantity)
    const jobFobValue = Number(detail.fob)
    const factoryFobValue = Number(detail.factoryFob)
    if (!Number.isFinite(quantityValue) || !Number.isFinite(jobFobValue)) return total

    const jobValue = quantityValue * jobFobValue
    const factoryValue = Number.isFinite(factoryFobValue) ? quantityValue * factoryFobValue : 0
    return total + jobValue - factoryValue
  }, 0)
}

function isFillDownShortcut(event: KeyboardEvent<HTMLInputElement>) {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d"
}

export function OrderPlacementFormDialog({
  open,
  mode,
  loading,
  submitting,
  loadingJobDetails,
  values,
  errors,
  selectedBuyer,
  selectedJob,
  selectedCurrency,
  selectedSupplier,
  loadBuyerOptions,
  loadJobOptions,
  loadCurrencyOptions,
  loadSupplierOptions,
  onBuyerOptionChange,
  onJobOptionChange,
  onCurrencyOptionChange,
  onSupplierOptionChange,
  onValuesChange,
  onExchangeRateRefresh,
  onJobDetailsLoad,
  onOpenChange,
  onSubmit,
}: OrderPlacementFormDialogProps) {
  const [buyerOpen, setBuyerOpen] = useState(false)
  const [jobOpen, setJobOpen] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<OrderPlacementDialogSectionId>("basic-info")
  const [activeFillDownRowIndex, setActiveFillDownRowIndex] = useState<number | null>(null)
  const [jobDetailsError, setJobDetailsError] = useState("")
  const sectionRefs = useRef<Record<OrderPlacementDialogSectionId, HTMLDivElement | null>>({ "basic-info": null, details: null, status: null })
  const isEditMode = mode === "edit"
  const totalQuantity = formatNumber(sumDetails(values.orderPlacementDetails, "quantity"))
  const totalFactoryCm = formatNumber(sumDetails(values.orderPlacementDetails, "totalFactoryCm"))
  const totalFactoryFob = formatNumber(sumDetails(values.orderPlacementDetails, "totalFactoryFob"))
  const totalProfit = formatNumber(sumProfitValue(values.orderPlacementDetails))

  function scrollToSection(sectionId: OrderPlacementDialogSectionId) {
    setActiveSection(sectionId)
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function update<K extends keyof OrderPlacementFormValues>(key: K, value: OrderPlacementFormValues[K]) {
    onValuesChange({ ...values, [key]: value })
  }

  function updateDetail(detailId: string, patch: Partial<OrderPlacementDetailFormValues>) {
    onValuesChange({
      ...values,
      orderPlacementDetails: values.orderPlacementDetails.map((detail) => {
        if (detail.id !== detailId) return detail
        const nextDetail = { ...detail, ...patch }
        nextDetail.totalFactoryCm = calculateFactoryCm(nextDetail.quantity, nextDetail.factoryCmPerDzn)
        nextDetail.totalFactoryFob = calculateFactoryFob(nextDetail.quantity, nextDetail.factoryFob)
        return nextDetail
      }),
    })
  }

  function fillDownFromRow(rowIndex: number) {
    if (rowIndex < 0 || rowIndex >= values.orderPlacementDetails.length - 1) return

    const source = values.orderPlacementDetails[rowIndex]
    const nextOrderPlacementDetails = values.orderPlacementDetails.map((detail, index) => {
      if (index <= rowIndex) return detail

      const nextDetail = {
        ...detail,
        factoryCmPerDzn: source.factoryCmPerDzn,
        factoryFob: source.factoryFob,
        factoryShipmentDate: source.factoryShipmentDate,
      }
      nextDetail.totalFactoryCm = calculateFactoryCm(nextDetail.quantity, nextDetail.factoryCmPerDzn)
      nextDetail.totalFactoryFob = calculateFactoryFob(nextDetail.quantity, nextDetail.factoryFob)
      return nextDetail
    })

    onValuesChange({ ...values, orderPlacementDetails: nextOrderPlacementDetails })
  }

  function handleEditableKeyDown(event: KeyboardEvent<HTMLInputElement>, rowIndex: number) {
    if (!isFillDownShortcut(event)) return

    event.preventDefault()
    fillDownFromRow(rowIndex)
  }

  async function handleJobChange(option: SelectOption | null) {
    onJobOptionChange(option)
    setJobDetailsError("")
    setActiveFillDownRowIndex(null)
    if (!option) {
      onValuesChange({ ...values, jobId: "", orderPlacementDetails: [] })
      return
    }

    try {
      const details = await onJobDetailsLoad(option.value)
      onValuesChange({ ...values, jobId: option.value, orderPlacementDetails: details })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load job details right now."
      setJobDetailsError(message)
      onValuesChange({ ...values, jobId: option.value, orderPlacementDetails: [] })
    }
  }

  function handleCurrencyChange(option: SelectOption | null) {
    onCurrencyOptionChange(option)
    const currencyId = option?.value ?? ""
    onValuesChange({ ...values, currencyId })
    if (currencyId) void onExchangeRateRefresh(currencyId, values.placementDate)
  }

  function handlePlacementDateChange(placementDate: string) {
    onValuesChange({ ...values, placementDate })
    if (values.currencyId) void onExchangeRateRefresh(values.currencyId, placementDate)
  }

  const errorBySection = new Set(errors.map((error) => error.section))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-slate-200/70 bg-slate-50 p-0 shadow-2xl sm:left-1/2 sm:top-1/2 sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg 2xl:w-[min(1400px,calc(100vw-4rem))] 2xl:max-w-[min(1400px,calc(100vw-4rem))] dark:border-white/10 dark:bg-[#080a14]">
        <form
          className="grid h-full min-h-0 w-full max-w-full min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-h-[calc(100vh-2rem)]"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <DialogHeader className="min-w-0 border-b border-slate-200/70 px-4 py-3 text-left dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <ClipboardCheck className="size-4" />
              </div>
              <div>
                <DialogTitle>{mode === "create" ? "New order placement" : "Edit order placement"}</DialogTitle>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Place job detail rows with supplier factory pricing and shipment dates.</p>
              </div>
            </div>
          </DialogHeader>

          <div className="grid min-h-0 min-w-0 grid-cols-1 overflow-hidden md:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="hidden border-r border-slate-200/70 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03] md:block">
              <div className="space-y-1">
                {SECTIONS.map((section) => (
                  <RailItem key={section.id} section={section} active={activeSection === section.id} count={section.id === "details" ? values.orderPlacementDetails.length : undefined} hasError={errorBySection.has(section.id)} onClick={() => scrollToSection(section.id)} />
                ))}
              </div>
              {errors.length ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  {errors[0]?.message}
                </div>
              ) : null}
            </aside>

            <div className="min-h-0 min-w-0 overflow-hidden">
              <ScrollArea
                className="h-full min-h-0 min-w-0 max-w-full overflow-hidden"
                viewportClassName="overflow-x-hidden [&>div]:!block [&>div]:!w-full [&>div]:!min-w-0 [&>div]:!max-w-full"
              >
                <div className="w-full max-w-full min-w-0 space-y-4 overflow-x-hidden p-3 sm:p-4">
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-36 rounded-lg" />
                      <Skeleton className="h-80 rounded-lg" />
                    </div>
                  ) : (
                    <>
                      <Card ref={(element) => { sectionRefs.current["basic-info"] = element }} id="basic-info" className="max-w-full min-w-0 scroll-mt-3 overflow-hidden rounded-lg border-slate-200/70 bg-white/75 shadow-none dark:border-white/10 dark:bg-[#17131d]/80">
                        <CardHeader className="px-4 pt-3 pb-2">
                          <CardTitle className="text-sm">Basic Info</CardTitle>
                        </CardHeader>
                        <CardContent className="grid max-w-full min-w-0 gap-3 px-3 pb-3 sm:px-4 md:grid-cols-2 xl:grid-cols-3">
                          <div className={FIELD_CLASS}>
                            <FieldLabel required>Buyer</FieldLabel>
                            <AppCombobox open={buyerOpen} onOpenChange={setBuyerOpen} value={selectedBuyer} onValueChange={(option) => { setActiveFillDownRowIndex(null); onBuyerOptionChange(option); onJobOptionChange(null); onValuesChange({ ...values, buyerId: option?.value ?? "", jobId: "", orderPlacementDetails: [] }) }} loadItems={loadBuyerOptions} placeholder="Search buyer" disabled={isEditMode} showClear={Boolean(values.buyerId) && !isEditMode} />
                          </div>
                          <div className={FIELD_CLASS}>
                            <FieldLabel required>Job</FieldLabel>
                            <AppCombobox open={jobOpen} onOpenChange={setJobOpen} value={selectedJob} onValueChange={(option) => void handleJobChange(option)} loadItems={loadJobOptions} placeholder={values.buyerId ? "Search job" : "Select buyer first"} disabled={isEditMode || !values.buyerId || loadingJobDetails} loading={loadingJobDetails} showClear={Boolean(values.jobId) && !isEditMode} />
                          </div>
                          <div className={FIELD_CLASS}>
                            <FieldLabel required>Currency</FieldLabel>
                            <AppCombobox open={currencyOpen} onOpenChange={setCurrencyOpen} value={selectedCurrency} onValueChange={handleCurrencyChange} loadItems={loadCurrencyOptions} placeholder="Search currency" showClear={Boolean(values.currencyId)} />
                          </div>
                          <div className={FIELD_CLASS}>
                            <FieldLabel required>Factory</FieldLabel>
                            <AppCombobox open={supplierOpen} onOpenChange={setSupplierOpen} value={selectedSupplier} onValueChange={(option) => { onSupplierOptionChange(option); update("factoryId", option?.value ?? "") }} loadItems={loadSupplierOptions} placeholder="Search supplier factory" showClear={Boolean(values.factoryId)} />
                          </div>
                          <div className={FIELD_CLASS}>
                            <FieldLabel required>Placement Date</FieldLabel>
                            <Input type="date" value={values.placementDate} onChange={(event) => handlePlacementDateChange(event.target.value)} />
                          </div>
                          <div className={FIELD_CLASS}>
                            <FieldLabel>Exchange Rate BDT</FieldLabel>
                            <Input
                              value={values.exchangeRateBDT}
                              onChange={(event) => {
                                const nextValue = normalizeExchangeRateInput(event.target.value)
                                if (nextValue == null) return
                                update("exchangeRateBDT", nextValue)
                              }}
                              onBlur={(event) => update("exchangeRateBDT", normalizeExchangeRateOnBlur(event.target.value))}
                              inputMode="decimal"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <Card ref={(element) => { sectionRefs.current.details = element }} id="details" className="max-w-full min-w-0 scroll-mt-3 overflow-hidden rounded-lg border-slate-200/70 bg-white/75 shadow-none dark:border-white/10 dark:bg-[#17131d]/80">
                        <CardHeader className="flex flex-col gap-3 px-4 pt-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-sm">Placement Details</CardTitle>
                            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">{values.orderPlacementDetails.length} rows</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Ctrl/Cmd+D fills down the factory columns from the active row.</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 rounded-md px-2 text-xs"
                              disabled={activeFillDownRowIndex == null || activeFillDownRowIndex >= values.orderPlacementDetails.length - 1}
                              onClick={() => {
                                if (activeFillDownRowIndex == null) return
                                fillDownFromRow(activeFillDownRowIndex)
                              }}
                            >
                              Fill Down
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 px-3 pb-3 sm:px-4">
                          {jobDetailsError ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{jobDetailsError}</div> : null}
                          {loadingJobDetails ? (
                            <Skeleton className="h-48 rounded-lg" />
                          ) : values.orderPlacementDetails.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">Select a buyer and job to load PO detail rows.</div>
                          ) : (
                            <>
                              <div className="max-w-full min-w-0 overflow-x-auto rounded-lg border border-slate-200/70 dark:border-white/10">
                                <table className="min-w-[1280px] table-fixed text-left text-xs">
                                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                                    <tr>
                                      <th className="w-28 px-2 py-2">PO</th>
                                      <th className="w-44 px-2 py-2">Style</th>
                                      <th className="w-24 px-2 py-2">Size</th>
                                      <th className="w-28 px-2 py-2">Color</th>
                                      <th className="w-24 px-2 py-2">Qty</th>
                                      <th className="w-24 px-2 py-2">FOB</th>
                                      <th className="w-24 px-2 py-2">CM/Dzn</th>
                                      <th className="w-32 px-2 py-2">Delivery</th>
                                      <th className="w-24 px-2 py-2">Factory CM/Dzn</th>
                                      <th className="w-24 px-2 py-2">Factory FOB</th>
                                      <th className="w-32 px-2 py-2">Shipment</th>
                                      <th className="w-28 px-2 py-2">Total CM</th>
                                      <th className="w-28 px-2 py-2">Total FOB</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                                    {values.orderPlacementDetails.map((detail, index) => (
                                      <tr key={detail.id} className="bg-white dark:bg-transparent">
                                        <td className={TABLE_CELL_CLASS}><span className="block min-w-0 truncate">{detail.poLabel}</span></td>
                                        <td className={TABLE_CELL_CLASS}><span className="block min-w-0 truncate">{detail.styleLabel}</span></td>
                                        <td className={TABLE_CELL_CLASS}><span className="block min-w-0 truncate">{detail.sizeLabel}</span></td>
                                        <td className={TABLE_CELL_CLASS}><span className="block min-w-0 truncate">{detail.colorLabel}</span></td>
                                        <td className={TABLE_CELL_CLASS}><span className="block min-w-0 truncate">{hideZeroValue(detail.quantity)}</span></td>
                                        <td className={TABLE_CELL_CLASS}><span className="block min-w-0 truncate">{hideZeroValue(detail.fob)}</span></td>
                                        <td className={TABLE_CELL_CLASS}><span className="block min-w-0 truncate">{hideZeroValue(detail.cm)}</span></td>
                                        <td className={TABLE_CELL_CLASS}><span className="block min-w-0 truncate">{detail.deliveryDate}</span></td>
                                        <td className="px-1.5 py-2 align-top"><Input value={hideZeroValue(detail.factoryCmPerDzn)} onFocus={() => setActiveFillDownRowIndex(index)} onKeyDown={(event) => handleEditableKeyDown(event, index)} onChange={(event) => updateDetail(detail.id, { factoryCmPerDzn: event.target.value })} inputMode="decimal" className={INPUT_CLASS} /></td>
                                        <td className="px-1.5 py-2 align-top"><Input value={hideZeroValue(detail.factoryFob)} onFocus={() => setActiveFillDownRowIndex(index)} onKeyDown={(event) => handleEditableKeyDown(event, index)} onChange={(event) => updateDetail(detail.id, { factoryFob: event.target.value })} inputMode="decimal" className={INPUT_CLASS} /></td>
                                        <td className="px-1.5 py-2 align-top"><Input type="date" value={detail.factoryShipmentDate} onFocus={() => setActiveFillDownRowIndex(index)} onKeyDown={(event) => handleEditableKeyDown(event, index)} onChange={(event) => updateDetail(detail.id, { factoryShipmentDate: event.target.value })} className={INPUT_CLASS} /></td>
                                        <td className={TABLE_CELL_CLASS}><span className="block min-w-0 truncate">{hideZeroValue(detail.totalFactoryCm)}</span></td>
                                        <td className={TABLE_CELL_CLASS}><span className="block min-w-0 truncate">{hideZeroValue(detail.totalFactoryFob)}</span></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Quantity:</Label>
                                <span className="font-medium text-slate-900 dark:text-white">{totalQuantity}</span>
                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Factory CM:</Label>
                                <span className="font-medium text-slate-900 dark:text-white">{totalFactoryCm}</span>
                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Factory FOB:</Label>
                                <span className="font-medium text-slate-900 dark:text-white">{totalFactoryFob}</span>
                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Profit:</Label>
                                <span className="font-medium text-slate-900 dark:text-white">{totalProfit}</span>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      <Card ref={(element) => { sectionRefs.current.status = element }} id="status" className="max-w-full min-w-0 scroll-mt-3 overflow-hidden rounded-lg border-slate-200/70 bg-white/75 shadow-none dark:border-white/10 dark:bg-[#17131d]/80">
                        <CardHeader className="px-4 pt-3 pb-2">
                          <CardTitle className="text-sm">Status</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 sm:px-4">
                          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium">Placed</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Placed records are treated as confirmed factory placements.</p>
                              </div>
                              <Switch checked={values.isPlaced} onCheckedChange={(checked) => update("isPlaced", checked)} />
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={loading || submitting || loadingJobDetails} className="rounded-xl">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {mode === "create" ? "Save Placement" : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
