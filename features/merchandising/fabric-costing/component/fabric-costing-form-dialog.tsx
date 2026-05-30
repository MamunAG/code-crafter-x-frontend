"use client"

import { useMemo, type ReactNode } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"

import {
  AppCombobox,
  type AppComboboxLoadParams,
  type AppComboboxLoadResult,
  type AppComboboxOption,
} from "@/components/app-combobox"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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

import {
  calculateFabricCost,
  type FabricCostingInput,
} from "../fabric-costing-calculation"
import type {
  FabricCostingCommonProcessFormValues,
  FabricCostingFormError,
  FabricCostingFormValues,
  FabricCostingYarnAdditionalCostFormValues,
  FabricCostingYarnFormValues,
  FabricCostingYarnProcessFormValues,
} from "../fabric-costing.types"

type FabricCostingFormDialogProps = {
  open: boolean
  mode: "create" | "edit"
  loading: boolean
  submitting: boolean
  values: FabricCostingFormValues
  errors: FabricCostingFormError[]
  loadMaterialOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadUnitOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadCurrencyOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadProcessOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadGmtCostScopeOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  onFabricChange?: (option: AppComboboxOption | null) => void
  onValuesChange: (values: FabricCostingFormValues) => void
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
}

const INPUT_CLASS = "h-8 rounded-md px-2 text-xs"
const MASTER_INPUT_CLASS = "h-8"

function optionFrom(value: string, label: string) {
  return value ? { value, label: label || value } : null
}

function toNumber(value: string | number | null | undefined) {
  const numericValue = Number(value ?? 0)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function formatQty(value: number) {
  return value.toFixed(4)
}

function formatMoney(value: number) {
  return value.toFixed(2)
}

function formatMoney4(value: number) {
  return value.toFixed(4)
}

function resolveCurrencySymbol(label: string) {
  const normalized = label.trim().toUpperCase()
  if (normalized.includes("USD")) return "$"
  if (label.includes("$")) return "$"
  return "$"
}

function newYarn(): FabricCostingYarnFormValues {
  return {
    id: crypto.randomUUID(),
    yarnId: "",
    yarnLabel: "",
    percentagePerUnitFabric: "0",
    yarnPricePerUnit: "0",
    totalYarnPrice: "0",
    yarnWiseProcesses: [],
    additionalMaterialCosts: [],
  }
}

function newAdditionalMaterialCost(): FabricCostingYarnAdditionalCostFormValues {
  return {
    id: crypto.randomUUID(),
    gmtCostScopeId: "",
    gmtCostScopeLabel: "",
    percentage: "0",
    directCost: "0",
  }
}

function newYarnProcess(): FabricCostingYarnProcessFormValues {
  return {
    id: crypto.randomUUID(),
    processId: "",
    processLabel: "",
    rateUnitFabric: "0",
    wastagePercentage: "0",
  }
}

function newCommonProcess(): FabricCostingCommonProcessFormValues {
  return {
    id: crypto.randomUUID(),
    processId: "",
    processLabel: "",
    ratePerUnitFabric: "0",
    wastagePercentage: "0",
  }
}

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </Label>
  )
}

function buildCalculationInput(values: FabricCostingFormValues): FabricCostingInput {
  const currencySymbol = resolveCurrencySymbol(values.currencyLabel)
  return {
    targetQty: toNumber(values.qty),
    currencySymbol,
    commonWastages: values.commonProcesses.map((process) => ({
      id: process.id,
      name: process.processLabel || "Unnamed process",
      wastagePercent: toNumber(process.wastagePercentage),
    })),
    materials: values.yarns.map((yarn) => ({
      id: yarn.id,
      name: yarn.yarnLabel || "Unnamed material",
      ratioPercent: toNumber(yarn.percentagePerUnitFabric),
      pricePerKg: toNumber(yarn.yarnPricePerUnit),
      extraProcesses: yarn.yarnWiseProcesses.map((process) => ({
        id: process.id,
        name: process.processLabel || "Unnamed extra process",
        wastagePercent: toNumber(process.wastagePercentage),
        costPerKg: toNumber(process.rateUnitFabric),
      })),
      additionalCosts: yarn.additionalMaterialCosts.map((additionalCost) => ({
        id: additionalCost.id,
        name: additionalCost.gmtCostScopeLabel || "Unnamed additional cost",
        percentage: toNumber(additionalCost.percentage),
        directCost: toNumber(additionalCost.directCost),
      })),
    })),
    processes: values.commonProcesses.map((process) => ({
      id: process.id,
      name: process.processLabel || "Unnamed process",
      costPerKg: toNumber(process.ratePerUnitFabric),
    })),
  }
}

export function FabricCostingFormDialog({
  open,
  mode,
  loading,
  submitting,
  values,
  errors,
  loadMaterialOptions,
  loadUnitOptions,
  loadCurrencyOptions,
  loadProcessOptions,
  loadGmtCostScopeOptions,
  onFabricChange,
  onValuesChange,
  onOpenChange,
  onSubmit,
}: FabricCostingFormDialogProps) {
  const disabled = loading || submitting
  const calculation = useMemo(() => calculateFabricCost(buildCalculationInput(values)), [values])

  function patchValues(patch: Partial<FabricCostingFormValues>) {
    onValuesChange({ ...values, ...patch })
  }

  function updateYarn(rowId: string, patch: Partial<FabricCostingYarnFormValues>) {
    patchValues({
      yarns: values.yarns.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    })
  }

  function updateYarnProcess(
    yarnId: string,
    processId: string,
    patch: Partial<FabricCostingYarnProcessFormValues>,
  ) {
    patchValues({
      yarns: values.yarns.map((row) =>
        row.id === yarnId
          ? {
              ...row,
              yarnWiseProcesses: row.yarnWiseProcesses.map((process) =>
                process.id === processId ? { ...process, ...patch } : process,
              ),
            }
          : row,
      ),
    })
  }

  function updateAdditionalMaterialCost(
    yarnId: string,
    additionalCostId: string,
    patch: Partial<FabricCostingYarnAdditionalCostFormValues>,
  ) {
    patchValues({
      yarns: values.yarns.map((row) =>
        row.id === yarnId
          ? {
              ...row,
              additionalMaterialCosts: row.additionalMaterialCosts.map((additionalCost) =>
                additionalCost.id === additionalCostId ? { ...additionalCost, ...patch } : additionalCost,
              ),
            }
          : row,
      ),
    })
  }

  function updateCommonProcess(rowId: string, patch: Partial<FabricCostingCommonProcessFormValues>) {
    patchValues({
      commonProcesses: values.commonProcesses.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row,
      ),
    })
  }

  const allErrors = [...errors.map((error) => error.message), ...calculation.validationErrors]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88dvh] w-[min(1280px,calc(100dvw-1.5rem))] max-w-none flex-col overflow-hidden p-0 sm:w-[min(1280px,calc(100dvw-2rem))] sm:max-w-none">
        <DialogHeader className="border-b px-4 py-4 dark:border-white/10 sm:px-6 sm:py-5">
          <DialogTitle>{mode === "create" ? "Create fabric costing" : "Edit fabric costing"}</DialogTitle>
          <DialogDescription>Dynamic costing with transparent quantity, wastage, and process formulas.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 p-4 sm:p-6">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1 overflow-hidden">
            <div className="space-y-5 p-4 sm:p-6">
              {allErrors.length ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200">
                  {allErrors.map((message, index) => (
                    <p key={`${message}-${index}`}>{message}</p>
                  ))}
                </div>
              ) : null}

              <Card size="sm" className="border-slate-200/80 dark:border-white/10">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm">Master Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(160px,0.7fr)_minmax(340px,2fr)_minmax(130px,0.7fr)_minmax(150px,0.8fr)_minmax(160px,0.8fr)]">
                    <div className="space-y-1.5">
                      <FieldLabel>Cost name</FieldLabel>
                      <Input
                        className={MASTER_INPUT_CLASS}
                        value={values.costName}
                        onChange={(event) => patchValues({ costName: event.target.value })}
                        placeholder="Input cost name"
                        disabled={disabled}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Fabric</FieldLabel>
                      <AppCombobox
                        value={optionFrom(values.fabricId, values.fabricLabel)}
                        onValueChange={(option) => {
                          patchValues({ fabricId: option?.value ?? "", fabricLabel: option?.label ?? "" })
                          onFabricChange?.(option)
                        }}
                        loadItems={loadMaterialOptions}
                        placeholder="Search fabric material"
                        disabled={disabled}
                        className={MASTER_INPUT_CLASS}
                        showClear
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel required>Target Qty</FieldLabel>
                      <Input
                        className={MASTER_INPUT_CLASS}
                        type="number"
                        step="0.0001"
                        value={values.qty}
                        onChange={(event) => patchValues({ qty: event.target.value })}
                        disabled={disabled}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Unit</FieldLabel>
                      <AppCombobox
                        value={optionFrom(values.unitId, values.unitLabel)}
                        onValueChange={(option) =>
                          patchValues({ unitId: option?.value ?? "", unitLabel: option?.label ?? "" })
                        }
                        loadItems={loadUnitOptions}
                        placeholder="Search unit"
                        disabled
                        className={MASTER_INPUT_CLASS}
                        showClear
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel required>Currency</FieldLabel>
                      <AppCombobox
                        value={optionFrom(values.currencyId, values.currencyLabel)}
                        onValueChange={(option) =>
                          patchValues({ currencyId: option?.value ?? "", currencyLabel: option?.label ?? "" })
                        }
                        loadItems={loadCurrencyOptions}
                        placeholder="Search currency"
                        disabled={disabled}
                        className={MASTER_INPUT_CLASS}
                        showClear
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card size="sm" className="gap-1.5 border-slate-200/80 dark:border-white/10">
                <CardHeader className="px-3 py-1">
                  <CardTitle className="text-sm">Materials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => patchValues({ yarns: [...values.yarns, newYarn()] })}
                      disabled={disabled}
                    >
                      <Plus className="size-3.5" />
                      Add material
                    </Button>
                  </div>
                  {values.yarns.length ? (
                    <div className="space-y-2">
                      {values.yarns.map((yarn, yarnIndex) => {
                        const extraWastage = yarn.yarnWiseProcesses.reduce(
                          (sum, process) => sum + toNumber(process.wastagePercentage),
                          0,
                        )
                        const baseQty = calculation.requiredQty * (toNumber(yarn.percentagePerUnitFabric) / 100)
                        const actualQty =
                          extraWastage >= 99 ? 0 : baseQty / (1 - extraWastage / 100)
                        const rawCost = actualQty * toNumber(yarn.yarnPricePerUnit)
                        const additionalMaterialCost = yarn.additionalMaterialCosts.reduce(
                          (sum, additionalCost) =>
                            sum +
                            (toNumber(additionalCost.directCost) > 0
                              ? toNumber(additionalCost.directCost)
                              : toNumber(yarn.yarnPricePerUnit) * (toNumber(additionalCost.percentage) / 100)),
                          0,
                        )
                        const totalPrice =
                          rawCost +
                          yarn.yarnWiseProcesses.reduce(
                            (sum, process) => sum + actualQty * toNumber(process.rateUnitFabric),
                            0,
                          ) +
                          additionalMaterialCost

                        return (
                          <div key={yarn.id} className="rounded-md border border-slate-200 p-2.5 dark:border-white/10">
                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.9fr)_repeat(5,minmax(110px,0.65fr))_auto]">
                              <div className="space-y-1">
                                <FieldLabel>Material</FieldLabel>
                                <AppCombobox
                                  value={optionFrom(yarn.yarnId, yarn.yarnLabel)}
                                  onValueChange={(option) =>
                                    updateYarn(yarn.id, {
                                      yarnId: option?.value ?? "",
                                      yarnLabel: option?.label ?? "",
                                    })
                                  }
                                  loadItems={loadMaterialOptions}
                                  placeholder="Search yarn material"
                                  disabled={disabled}
                                  showClear
                                />
                              </div>
                              <div className="space-y-1">
                                <FieldLabel>Ratio %</FieldLabel>
                                <Input
                                  className={INPUT_CLASS}
                                  type="number"
                                  step="0.0001"
                                  value={yarn.percentagePerUnitFabric}
                                  onChange={(event) =>
                                    updateYarn(yarn.id, { percentagePerUnitFabric: event.target.value })
                                  }
                                  disabled={disabled}
                                />
                              </div>
                              <div className="space-y-1">
                                <FieldLabel>Price / KG</FieldLabel>
                                <Input
                                  className={INPUT_CLASS}
                                  type="number"
                                  step="0.0001"
                                  value={yarn.yarnPricePerUnit}
                                  onChange={(event) =>
                                    updateYarn(yarn.id, { yarnPricePerUnit: event.target.value })
                                  }
                                  disabled={disabled}
                                />
                              </div>
                              <div className="space-y-1">
                                <FieldLabel>Base Qty</FieldLabel>
                                <Input className={INPUT_CLASS} value={formatQty(baseQty)} readOnly disabled />
                              </div>
                              <div className="space-y-1">
                                <FieldLabel>Actual Qty</FieldLabel>
                                <Input className={INPUT_CLASS} value={formatQty(actualQty)} readOnly disabled />
                              </div>
                              <div className="space-y-1">
                                <FieldLabel>Total Price</FieldLabel>
                                <Input
                                  className={INPUT_CLASS}
                                  value={formatMoney(totalPrice)}
                                  readOnly
                                  disabled
                                />
                              </div>
                              <div className="flex items-end justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() =>
                                    patchValues({ yarns: values.yarns.filter((item) => item.id !== yarn.id) })
                                  }
                                  disabled={disabled}
                                  aria-label={`Remove material row ${yarnIndex + 1}`}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </div>

                            <div className="mt-2 grid gap-2 xl:grid-cols-2">
                            <div className="rounded-md bg-slate-50 p-2 dark:bg-white/5">
                              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                  Extra Material Processes
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateYarn(yarn.id, {
                                      yarnWiseProcesses: [...yarn.yarnWiseProcesses, newYarnProcess()],
                                    })
                                  }
                                  disabled={disabled}
                                >
                                  <Plus className="size-3.5" />
                                  Add extra process
                                </Button>
                              </div>
                              {yarn.yarnWiseProcesses.length ? (
                                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/40">
                                  <table className="w-full table-fixed text-left text-[11px]">
                                    <colgroup>
                                      <col className="w-[46%]" />
                                      <col className="w-[17%]" />
                                      <col className="w-[17%]" />
                                      <col className="w-[12%]" />
                                      <col className="w-[8%]" />
                                    </colgroup>
                                    <thead className="bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
                                      <tr>
                                        <th className="px-2 py-1.5">Process</th>
                                        <th className="px-2 py-1.5">Cost / KG</th>
                                        <th className="px-2 py-1.5">Wastage %</th>
                                        <th className="px-2 py-1.5">Cost</th>
                                        <th className="px-1 py-1.5 text-center">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                                      {yarn.yarnWiseProcesses.map((process) => (
                                        <tr key={process.id} className="align-top">
                                          <td className="px-2 py-1.5">
                                            <AppCombobox
                                              value={optionFrom(process.processId, process.processLabel)}
                                              onValueChange={(option) =>
                                                updateYarnProcess(yarn.id, process.id, {
                                                  processId: option?.value ?? "",
                                                  processLabel: option?.label ?? "",
                                                })
                                              }
                                              loadItems={loadProcessOptions}
                                              placeholder="Search process"
                                              disabled={disabled}
                                              showClear
                                            />
                                          </td>
                                          <td className="px-2 py-1.5">
                                            <Input
                                              className={INPUT_CLASS}
                                              type="number"
                                              step="0.0001"
                                              value={process.rateUnitFabric}
                                              onChange={(event) =>
                                                updateYarnProcess(yarn.id, process.id, {
                                                  rateUnitFabric: event.target.value,
                                                })
                                              }
                                              disabled={disabled}
                                            />
                                          </td>
                                          <td className="px-2 py-1.5">
                                            <Input
                                              className={INPUT_CLASS}
                                              type="number"
                                              step="0.0001"
                                              value={process.wastagePercentage}
                                              onChange={(event) =>
                                                updateYarnProcess(yarn.id, process.id, {
                                                  wastagePercentage: event.target.value,
                                                })
                                              }
                                              disabled={disabled}
                                            />
                                          </td>
                                          <td className="px-2 py-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                                            {formatMoney(actualQty * toNumber(process.rateUnitFabric))}
                                          </td>
                                          <td className="whitespace-nowrap px-1 py-2 text-center">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="size-7"
                                              onClick={() =>
                                                updateYarn(yarn.id, {
                                                  yarnWiseProcesses: yarn.yarnWiseProcesses.filter(
                                                    (item) => item.id !== process.id,
                                                  ),
                                                })
                                              }
                                              disabled={disabled}
                                              aria-label="Remove extra process"
                                            >
                                              <Trash2 className="size-3.5" />
                                            </Button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 dark:text-slate-400">No extra process rows added.</p>
                              )}
                            </div>
                            <div className="rounded-md bg-slate-50 p-2 dark:bg-white/5">
                              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                  Additional Material Cost
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateYarn(yarn.id, {
                                      additionalMaterialCosts: [
                                        ...yarn.additionalMaterialCosts,
                                        newAdditionalMaterialCost(),
                                      ],
                                    })
                                  }
                                  disabled={disabled}
                                >
                                  <Plus className="size-3.5" />
                                  Add additional cost
                                </Button>
                              </div>
                              {yarn.additionalMaterialCosts.length ? (
                                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/40">
                                  <table className="w-full table-fixed text-left text-[11px]">
                                    <colgroup>
                                      <col className="w-[38%]" />
                                      <col className="w-[18%]" />
                                      <col className="w-[18%]" />
                                      <col className="w-[18%]" />
                                      <col className="w-[8%]" />
                                    </colgroup>
                                    <thead className="bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
                                      <tr>
                                        <th className="px-2 py-1.5">Cost Scope</th>
                                        <th className="px-2 py-1.5">Percentage %</th>
                                        <th className="px-2 py-1.5">Direct Cost</th>
                                        <th className="px-2 py-1.5">Cost</th>
                                        <th className="px-1 py-1.5 text-center">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                                      {yarn.additionalMaterialCosts.map((additionalCost) => {
                                        const cost =
                                          toNumber(additionalCost.directCost) > 0
                                            ? toNumber(additionalCost.directCost)
                                            : toNumber(yarn.yarnPricePerUnit) * (toNumber(additionalCost.percentage) / 100)
                                        return (
                                          <tr key={additionalCost.id} className="align-top">
                                            <td className="px-2 py-1.5">
                                              <AppCombobox
                                                value={optionFrom(
                                                  additionalCost.gmtCostScopeId,
                                                  additionalCost.gmtCostScopeLabel,
                                                )}
                                                onValueChange={(option) =>
                                                  updateAdditionalMaterialCost(yarn.id, additionalCost.id, {
                                                    gmtCostScopeId: option?.value ?? "",
                                                    gmtCostScopeLabel: option?.label ?? "",
                                                  })
                                                }
                                                loadItems={loadGmtCostScopeOptions}
                                                placeholder="Search cost scope"
                                                disabled={disabled}
                                                showClear
                                              />
                                            </td>
                                            <td className="px-2 py-1.5">
                                              <Input
                                                className={INPUT_CLASS}
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.0001"
                                                value={additionalCost.percentage}
                                                onChange={(event) =>
                                                  updateAdditionalMaterialCost(yarn.id, additionalCost.id, {
                                                    percentage: event.target.value,
                                                    ...(toNumber(event.target.value) > 0 ? { directCost: "0" } : {}),
                                                  })
                                                }
                                                disabled={disabled}
                                              />
                                            </td>
                                            <td className="px-2 py-1.5">
                                              <Input
                                                className={INPUT_CLASS}
                                                type="number"
                                                min="0"
                                                step="0.0001"
                                                value={additionalCost.directCost}
                                                onChange={(event) =>
                                                  updateAdditionalMaterialCost(yarn.id, additionalCost.id, {
                                                    directCost: event.target.value,
                                                    ...(toNumber(event.target.value) > 0 ? { percentage: "0" } : {}),
                                                  })
                                                }
                                                disabled={disabled}
                                              />
                                            </td>
                                            <td className="px-2 py-2 text-[11px] text-slate-700 dark:text-slate-300">
                                              {formatMoney4(cost)}
                                            </td>
                                            <td className="whitespace-nowrap px-1 py-2 text-center">
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-7"
                                                onClick={() =>
                                                  updateYarn(yarn.id, {
                                                    additionalMaterialCosts: yarn.additionalMaterialCosts.filter(
                                                      (item) => item.id !== additionalCost.id,
                                                    ),
                                                  })
                                                }
                                                disabled={disabled}
                                                aria-label="Remove additional material cost"
                                              >
                                                <Trash2 className="size-3.5" />
                                              </Button>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  No additional material costs added.
                                </p>
                              )}
                            </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                      No material rows added.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card size="sm" className="border-slate-200/80 dark:border-white/10">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm">Common Wastage + Process Cost</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        patchValues({ commonProcesses: [...values.commonProcesses, newCommonProcess()] })
                      }
                      disabled={disabled}
                    >
                      <Plus className="size-3.5" />
                      Add common row
                    </Button>
                  </div>

                  {values.commonProcesses.length ? (
                    <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-white/10">
                      <table className="w-full table-fixed text-left text-[11px]">
                        <colgroup>
                          <col className="w-[48%]" />
                          <col className="w-[18%]" />
                          <col className="w-[18%]" />
                          <col className="w-[12%]" />
                          <col className="w-[4%]" />
                        </colgroup>
                        <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
                          <tr>
                            <th className="px-2 py-1.5">Process</th>
                            <th className="px-2 py-1.5">Wastage %</th>
                            <th className="px-2 py-1.5">Cost / KG</th>
                            <th className="px-2 py-1.5">Cost</th>
                            <th className="px-1.5 pr-3 py-1.5 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                          {values.commonProcesses.map((process) => (
                            <tr key={process.id} className="align-top">
                              <td className="px-2 py-1.5">
                                <AppCombobox
                                  value={optionFrom(process.processId, process.processLabel)}
                                  onValueChange={(option) =>
                                    updateCommonProcess(process.id, {
                                      processId: option?.value ?? "",
                                      processLabel: option?.label ?? "",
                                    })
                                  }
                                  loadItems={loadProcessOptions}
                                  placeholder="Search process"
                                  disabled={disabled}
                                  showClear
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <Input
                                  className={INPUT_CLASS}
                                  type="number"
                                  step="0.0001"
                                  value={process.wastagePercentage}
                                  onChange={(event) =>
                                    updateCommonProcess(process.id, { wastagePercentage: event.target.value })
                                  }
                                  disabled={disabled}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <Input
                                  className={INPUT_CLASS}
                                  type="number"
                                  step="0.0001"
                                  value={process.ratePerUnitFabric}
                                  onChange={(event) =>
                                    updateCommonProcess(process.id, { ratePerUnitFabric: event.target.value })
                                  }
                                  disabled={disabled}
                                />
                              </td>
                              <td className="px-2 py-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                                {formatMoney(calculation.requiredQty * toNumber(process.ratePerUnitFabric))}
                              </td>
                              <td className="whitespace-nowrap px-1.5 py-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() =>
                                    patchValues({
                                      commonProcesses: values.commonProcesses.filter((item) => item.id !== process.id),
                                    })
                                  }
                                  disabled={disabled}
                                  aria-label="Remove common process"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                      No common rows added.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Accordion type="single" collapsible className="rounded-xl border border-slate-200/80 dark:border-white/10">
                <AccordionItem value="advanced-analysis" className="border-b-0">
                  <AccordionTrigger className="px-4 py-3 text-sm font-semibold">
                    Additional analysis and breakdowns
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3">
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <Card className="border-slate-200/80 dark:border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-slate-500 dark:text-slate-400">Finished Fabric Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold text-slate-950 dark:text-white">
                      {calculation.input.currencySymbol}
                      {formatMoney4(calculation.finalCost)} / KG
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200/80 dark:border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-slate-500 dark:text-slate-400">Finished Qty</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold text-slate-950 dark:text-white">
                      {formatQty(calculation.input.targetQty)} KG
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200/80 dark:border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-slate-500 dark:text-slate-400">Total Yarn Qty</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold text-slate-950 dark:text-white">
                      {formatQty(calculation.totalYarnQty)} KG
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200/80 dark:border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-slate-500 dark:text-slate-400">Common Wastage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold text-slate-950 dark:text-white">
                      {formatQty(calculation.totalCommonWastage)}%
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200/80 dark:border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-slate-500 dark:text-slate-400">Required Process Qty</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold text-slate-950 dark:text-white">
                      {formatQty(calculation.requiredQty)} KG
                    </p>
                  </CardContent>
                </Card>
              </section>

              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-slate-200/80 dark:border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Material Cost</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold text-slate-950 dark:text-white">
                    {calculation.input.currencySymbol}
                    {formatMoney(calculation.totalMaterialCost)}
                  </CardContent>
                </Card>
                <Card className="border-slate-200/80 dark:border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Process Cost</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold text-slate-950 dark:text-white">
                    {calculation.input.currencySymbol}
                    {formatMoney(calculation.totalProcessCost)}
                  </CardContent>
                </Card>
                <Card className="border-slate-200/80 dark:border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Additional Material Cost</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold text-slate-950 dark:text-white">
                    {calculation.input.currencySymbol}
                    {formatMoney4(calculation.totalAdditionalMaterialCost)}
                  </CardContent>
                </Card>
                <Card className="border-slate-200/80 dark:border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Final Cost</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold text-slate-950 dark:text-white">
                    {calculation.input.currencySymbol}
                    {formatMoney4(calculation.finalCost)}
                  </CardContent>
                </Card>
              </section>

              <Card className="border-slate-200/80 dark:border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Visual Process Flow</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <p>{formatQty(calculation.input.targetQty)} KG Finished Fabric</p>
                  <p>↓</p>
                  <p>+{formatQty(calculation.totalCommonWastage)}% Common Wastage</p>
                  <p>↓</p>
                  <p>{formatQty(calculation.requiredQty)} KG Required Qty</p>
                  <p>↓</p>
                  <p className="font-medium">Material Split</p>
                  {calculation.materialResults.map((material) => (
                    <p key={material.id}>
                      {material.name} {formatQty(material.ratioPercent)}% → {formatQty(material.actualQty)} KG →{" "}
                      {calculation.input.currencySymbol}
                      {formatMoney(material.totalCost)}
                    </p>
                  ))}
                  <p>↓</p>
                  <p className="font-medium">Additional Material Cost</p>
                  {calculation.materialResults.flatMap((material) =>
                    material.additionalCosts.map((additionalCost) => (
                      <p key={`${material.id}-additional-${additionalCost.id}`}>
                        {material.name}: {additionalCost.name} - {calculation.input.currencySymbol}
                        {formatMoney4(
                          additionalCost.directCost > 0
                            ? additionalCost.directCost
                            : material.pricePerKg * (additionalCost.percentage / 100),
                        )}
                      </p>
                    )),
                  )}
                  <p className="font-medium">Process Cost</p>
                  {calculation.processResults.map((process) => (
                    <p key={process.id}>
                      {process.name} → {calculation.input.currencySymbol}
                      {formatMoney(process.cost)}
                    </p>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Cost Breakdown Table</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Base Qty</th>
                          <th className="px-3 py-2">Wastage %</th>
                          <th className="px-3 py-2">Actual Qty</th>
                          <th className="px-3 py-2">Rate</th>
                          <th className="px-3 py-2">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                        {calculation.breakdownRows.map((row) => (
                          <tr key={row.id}>
                            <td className="px-3 py-2">{row.type}</td>
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2">{formatQty(row.baseQty)}</td>
                            <td className="px-3 py-2">{formatQty(row.wastagePercent)}</td>
                            <td className="px-3 py-2">{formatQty(row.actualQty)}</td>
                            <td className="px-3 py-2">{formatMoney(row.rate)}</td>
                            <td className="px-3 py-2">
                              {calculation.input.currencySymbol}
                              {formatMoney(row.cost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Calculation Trace</CardTitle>
                </CardHeader>
                <CardContent>
                  {calculation.breakdownRows.length ? (
                    <Accordion type="multiple" className="rounded-lg border-slate-200 dark:border-white/10">
                      {calculation.breakdownRows.map((row) => (
                        <AccordionItem key={`trace-${row.id}`} value={`trace-${row.id}`}>
                          <AccordionTrigger className="px-3 py-2 text-sm font-medium">
                            {row.type}: {row.name} ({calculation.input.currencySymbol}
                            {formatMoney(row.cost)})
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-3">
                            {row.traceLines.map((line, index) => (
                              <p key={`${row.id}-line-${index}`}>{line}</p>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No calculation trace yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Formula View</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-white/5">
{`totalCommonWastage = sum(commonWastages)
requiredQty = targetQty / (1 - totalCommonWastage / 100)
materialBaseQty = requiredQty * ratio / 100
materialActualQty = materialBaseQty / (1 - extraWastage / 100)
materialCost = materialActualQty * pricePerKg
extraMaterialProcessCost = materialActualQty * extraProcessCostPerKg
additionalMaterialCost = directCost OR (pricePerKg * percentage / 100)
processCost = requiredQty * processCostPerKg`}
                  </pre>
                </CardContent>
              </Card>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="shrink-0 border-t px-4 py-4 dark:border-white/10 sm:px-6">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Finished Fabric Cost:</span>
              <span className="text-base font-semibold text-slate-950 dark:text-white">
                {calculation.input.currencySymbol}
                {formatMoney4(calculation.finalCost)} / KG
              </span>
            </div>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="button" onClick={onSubmit} disabled={disabled} className="w-full sm:w-auto">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {mode === "create" ? "Save costing" : "Update costing"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
