"use client"

import type { ReactNode } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"

import {
  AppCombobox,
  type AppComboboxLoadParams,
  type AppComboboxLoadResult,
  type AppComboboxOption,
} from "@/components/app-combobox"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"

import type {
  FabricCostingCommonProcessFormValues,
  FabricCostingFormError,
  FabricCostingFormValues,
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
  loadStyleOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadMaterialOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadUnitOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadCurrencyOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadProcessOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  onValuesChange: (values: FabricCostingFormValues) => void
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
}

const INPUT_CLASS = "h-7 rounded-md px-2 text-[11px]"

function optionFrom(value: string, label: string) {
  return value ? { value, label: label || value } : null
}

function newYarn(): FabricCostingYarnFormValues {
  return {
    id: crypto.randomUUID(),
    yarnId: "",
    yarnLabel: "",
    percentagePerUnitFabric: "0",
    yarnPricePerUnit: "0",
    totalYarnConsumption: "0",
    totalYarnPrice: "0",
    yarnWiseProcesses: [],
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

export function FabricCostingFormDialog({
  open,
  mode,
  loading,
  submitting,
  values,
  errors,
  loadStyleOptions,
  loadMaterialOptions,
  loadUnitOptions,
  loadCurrencyOptions,
  loadProcessOptions,
  onValuesChange,
  onOpenChange,
  onSubmit,
}: FabricCostingFormDialogProps) {
  const disabled = loading || submitting

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

  function updateCommonProcess(rowId: string, patch: Partial<FabricCostingCommonProcessFormValues>) {
    patchValues({
      commonProcesses: values.commonProcesses.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row,
      ),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92dvh] w-[min(1320px,calc(100dvw-0.75rem))] max-w-none flex-col overflow-hidden p-0 sm:w-[min(1320px,calc(100dvw-1rem))] sm:max-w-none">
        <DialogHeader className="border-b px-4 py-4 dark:border-white/10 sm:px-6 sm:py-5">
          <DialogTitle>{mode === "create" ? "Create fabric costing" : "Edit fabric costing"}</DialogTitle>
          <DialogDescription>Map a fabric, currency, yarn consumption, and process cost details.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 p-4 sm:p-6">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1 overflow-hidden">
            <div className="space-y-5 p-4 sm:p-6">
              {errors.length ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200">
                  {errors.map((error) => (
                    <p key={error.message}>{error.message}</p>
                  ))}
                </div>
              ) : null}

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <FieldLabel>Cost name</FieldLabel>
                  <Input
                    value={values.costName}
                    onChange={(event) => patchValues({ costName: event.target.value })}
                    placeholder="Input cost name"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Style</FieldLabel>
                  <AppCombobox
                    value={optionFrom(values.styleId, values.styleLabel)}
                    onValueChange={(option) =>
                      patchValues({ styleId: option?.value ?? "", styleLabel: option?.label ?? "" })
                    }
                    loadItems={loadStyleOptions}
                    placeholder="Search style"
                    disabled={disabled}
                    showClear
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Fabric</FieldLabel>
                  <AppCombobox
                    value={optionFrom(values.fabricId, values.fabricLabel)}
                    onValueChange={(option) =>
                      patchValues({ fabricId: option?.value ?? "", fabricLabel: option?.label ?? "" })
                    }
                    loadItems={loadMaterialOptions}
                    placeholder="Search fabric material"
                    disabled={disabled}
                    showClear
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Quantity</FieldLabel>
                  <Input
                    type="number"
                    step="0.0001"
                    value={values.qty}
                    onChange={(event) => patchValues({ qty: event.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Unit</FieldLabel>
                  <AppCombobox
                    value={optionFrom(values.unitId, values.unitLabel)}
                    onValueChange={(option) =>
                      patchValues({ unitId: option?.value ?? "", unitLabel: option?.label ?? "" })
                    }
                    loadItems={loadUnitOptions}
                    placeholder="Search unit"
                    disabled={disabled}
                    showClear
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel required>Currency</FieldLabel>
                  <AppCombobox
                    value={optionFrom(values.currencyId, values.currencyLabel)}
                    onValueChange={(option) =>
                      patchValues({ currencyId: option?.value ?? "", currencyLabel: option?.label ?? "" })
                    }
                    loadItems={loadCurrencyOptions}
                    placeholder="Search currency"
                    disabled={disabled}
                    showClear
                  />
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Yarns</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Add yarn consumption and yarn-wise processes.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => patchValues({ yarns: [...values.yarns, newYarn()] })}
                    disabled={disabled}
                  >
                    <Plus className="size-3.5" />
                    Add yarn
                  </Button>
                </div>

                <div className="space-y-3">
                  {values.yarns.map((yarn, yarnIndex) => (
                    <div key={yarn.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.6fr)_repeat(4,minmax(105px,0.7fr))_auto]">
                        <div className="space-y-1.5">
                          <FieldLabel>Yarn</FieldLabel>
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
                        <div className="space-y-1.5">
                          <FieldLabel>% / fabric</FieldLabel>
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
                        <div className="space-y-1.5">
                          <FieldLabel>Yarn price</FieldLabel>
                          <Input
                            className={INPUT_CLASS}
                            type="number"
                            step="0.0001"
                            value={yarn.yarnPricePerUnit}
                            onChange={(event) => updateYarn(yarn.id, { yarnPricePerUnit: event.target.value })}
                            disabled={disabled}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>Consumption</FieldLabel>
                          <Input
                            className={INPUT_CLASS}
                            type="number"
                            step="0.0001"
                            value={yarn.totalYarnConsumption}
                            onChange={(event) =>
                              updateYarn(yarn.id, { totalYarnConsumption: event.target.value })
                            }
                            disabled={disabled}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>Total price</FieldLabel>
                          <Input
                            className={INPUT_CLASS}
                            type="number"
                            step="0.0001"
                            value={yarn.totalYarnPrice}
                            onChange={(event) => updateYarn(yarn.id, { totalYarnPrice: event.target.value })}
                            disabled={disabled}
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
                            aria-label={`Remove yarn row ${yarnIndex + 1}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-2.5 dark:bg-white/5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Yarn processes</p>
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
                            Add process
                          </Button>
                        </div>
                        {yarn.yarnWiseProcesses.length ? (
                          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/40 md:w-1/2">
                            <table className="w-full table-fixed text-left text-[11px]">
                              <colgroup>
                                <col className="w-[62%]" />
                                <col className="w-[16%]" />
                                <col className="w-[14%]" />
                                <col className="w-[8%]" />
                              </colgroup>
                              <thead className="bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
                                <tr>
                                  <th className="px-2.5 py-1.5">Process</th>
                                  <th className="px-2.5 py-1.5">Rate</th>
                                  <th className="px-2.5 py-1.5">Wastage %</th>
                                  <th className="px-1.5 pr-3 py-1.5 whitespace-nowrap text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                                {yarn.yarnWiseProcesses.map((process) => (
                                  <tr key={process.id} className="align-top">
                                    <td className="px-2.5 py-2">
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
                                        className="min-w-0"
                                      />
                                    </td>
                                    <td className="px-2.5 py-2">
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
                                        placeholder="Rate"
                                        disabled={disabled}
                                      />
                                    </td>
                                    <td className="px-2.5 py-2">
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
                                        placeholder="Wastage %"
                                        disabled={disabled}
                                      />
                                    </td>
                                    <td className="whitespace-nowrap px-1.5 py-2 text-center">
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
                                        aria-label="Remove yarn process"
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
                          <p className="text-xs text-slate-500 dark:text-slate-400">No yarn process rows added.</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {!values.yarns.length ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                      No yarn rows added.
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Common processes</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Add process costs that apply to the fabric costing.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => patchValues({ commonProcesses: [...values.commonProcesses, newCommonProcess()] })}
                    disabled={disabled}
                  >
                    <Plus className="size-3.5" />
                    Add process
                  </Button>
                </div>

                {values.commonProcesses.length ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 md:w-1/2">
                    <table className="w-full table-fixed text-left text-[11px]">
                      <colgroup>
                        <col className="w-[64%]" />
                        <col className="w-[15%]" />
                        <col className="w-[13%]" />
                        <col className="w-[8%]" />
                      </colgroup>
                      <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
                        <tr>
                          <th className="px-2.5 py-1.5">Process</th>
                          <th className="px-2.5 py-1.5">Rate</th>
                          <th className="px-2.5 py-1.5">Wastage %</th>
                          <th className="px-1.5 pr-3 py-1.5 whitespace-nowrap text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                        {values.commonProcesses.map((process) => (
                          <tr key={process.id} className="align-top">
                            <td className="px-2.5 py-2">
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
                                className="min-w-0"
                              />
                            </td>
                            <td className="px-2.5 py-2">
                              <Input
                                className={INPUT_CLASS}
                                type="number"
                                step="0.0001"
                                value={process.ratePerUnitFabric}
                                onChange={(event) =>
                                  updateCommonProcess(process.id, { ratePerUnitFabric: event.target.value })
                                }
                                placeholder="Rate"
                                disabled={disabled}
                              />
                            </td>
                            <td className="px-2.5 py-2">
                              <Input
                                className={INPUT_CLASS}
                                type="number"
                                step="0.0001"
                                value={process.wastagePercentage}
                                onChange={(event) =>
                                  updateCommonProcess(process.id, { wastagePercentage: event.target.value })
                                }
                                placeholder="Wastage %"
                                disabled={disabled}
                              />
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
                ) : null}

                {!values.commonProcesses.length ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                    No common process rows added.
                  </div>
                ) : null}
              </section>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="shrink-0 border-t px-4 py-4 dark:border-white/10 sm:px-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={disabled} className="w-full sm:w-auto">
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {mode === "create" ? "Save costing" : "Update costing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
