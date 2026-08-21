"use client"

import { Calculator, Loader2, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { HrFormDialog, type HrFormField, type HrFormValues } from "../../shared/hr-form-dialog"
import type { PayrollScopeOptions } from "../../operations/operations.types"
import type { HrOption } from "../../shared/hr.types"

export type PayrollEntryFormValues = HrFormValues & {
  factoryId: string
  payGroupId: string
  processingMode: "INDIVIDUAL" | "BULK"
  employeeId: string
  departmentId: string
  designationId: string
  sectionName: string
  includeAllEligible: boolean
  frequency: string
  runType: string
  periodStart: string
  periodEnd: string
  paymentDate: string
  rulePackId: string
  currency: string
  sequence: number
  formulaInputsJson: string
}

type Props = {
  open: boolean
  values: PayrollEntryFormValues
  factories: HrOption[]
  payGroups: HrOption[]
  rulePacks: HrOption[]
  scopeOptions: PayrollScopeOptions | null
  scopeLoading: boolean
  submitting: boolean
  error: string
  onOpenChange: (open: boolean) => void
  onChange: (name: string, value: PayrollEntryFormValues[string]) => void
  onSubmit: () => void
}

export function PayrollEntryForm({ open, values, factories, payGroups, rulePacks, scopeOptions, scopeLoading, submitting, error, onOpenChange, onChange, onSubmit }: Props) {
  const employees = scopeOptions?.employees ?? []
  const hasBulkFilter = Boolean(values.departmentId || values.designationId || values.sectionName)
  const matches = employees.filter((employee) => {
    if (values.processingMode === "INDIVIDUAL") return employee.id === values.employeeId
    if (values.includeAllEligible) return true
    if (!hasBulkFilter) return false
    return (!values.departmentId || employee.departmentId === values.departmentId) && (!values.designationId || employee.designationId === values.designationId) && (!values.sectionName || employee.sectionName === values.sectionName)
  })
  const scopeReady = Boolean(values.factoryId && values.payGroupId)
  const scopeFields: HrFormField[] = values.processingMode === "INDIVIDUAL"
    ? [{ name: "employeeId", label: "Employee", kind: "select", required: true, disabled: !scopeReady || scopeLoading, placeholder: scopeLoading ? "Loading employees…" : "Select employee", className: "sm:col-span-2", options: employees.map((employee) => ({ value: employee.id, label: `${employee.employeeCode} · ${employee.employeeName}` })) }]
    : [
        { name: "includeAllEligible", label: "All eligible employees", kind: "switch", description: "Include everyone in this factory and pay group; turn off to combine the filters below.", className: "sm:col-span-2" },
        { name: "departmentId", label: "Department", kind: "select", disabled: values.includeAllEligible || !scopeReady || scopeLoading, placeholder: "Any department", options: [{ value: "__any__", label: "Any department" }, ...(scopeOptions?.departments ?? []).map((item) => ({ value: item.id, label: item.name }))] },
        { name: "sectionName", label: "Section", kind: "select", disabled: values.includeAllEligible || !scopeReady || scopeLoading, placeholder: "Any section", options: [{ value: "__any__", label: "Any section" }, ...(scopeOptions?.sections ?? []).map((item) => ({ value: item, label: item }))] },
        { name: "designationId", label: "Designation", kind: "select", disabled: values.includeAllEligible || !scopeReady || scopeLoading, placeholder: "Any designation", className: "sm:col-span-2", options: [{ value: "__any__", label: "Any designation" }, ...(scopeOptions?.designations ?? []).map((item) => ({ value: item.id, label: item.name }))] },
      ]

  return (
    <HrFormDialog
      open={open}
      title="Create salary process"
      description="Choose one employee or a bulk workforce scope, then freeze the period and formula inputs for calculation."
      values={values}
      submitting={submitting}
      error={error}
      submitLabel="Create salary process"
      onOpenChange={onOpenChange}
      onChange={(name, value) => onChange(name, value === "__any__" ? "" : value)}
      onSubmit={onSubmit}
      fields={[
        { name: "processingMode", label: "Processing mode", kind: "select", required: true, className: "sm:col-span-2", options: [{ value: "INDIVIDUAL", label: "Individual employee" }, { value: "BULK", label: "Bulk processing" }] },
        { name: "factoryId", label: "Factory", kind: "select", required: true, options: factories },
        { name: "payGroupId", label: "Pay group", kind: "select", required: true, options: payGroups },
        ...scopeFields,
        { name: "frequency", label: "Frequency", kind: "select", required: true, options: ["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY"].map((value) => ({ value, label: value })) },
        { name: "runType", label: "Run type", kind: "select", required: true, options: ["REGULAR", "BONUS", "ARREARS", "ADJUSTMENT", "FINAL_SETTLEMENT"].map((value) => ({ value, label: value.replaceAll("_", " ") })) },
        { name: "periodStart", label: "Period start", kind: "date", required: true },
        { name: "periodEnd", label: "Period end", kind: "date", required: true },
        { name: "paymentDate", label: "Payment date", kind: "date", required: true },
        { name: "sequence", label: "Sequence", kind: "number", min: 1, required: true },
        { name: "rulePackId", label: "Statutory rule pack", kind: "select", options: [{ value: "__none__", label: "Use organization default" }, ...rulePacks] },
        { name: "currency", label: "Currency", required: true, placeholder: "BDT" },
        { name: "formulaInputsJson", label: "Additional formula inputs (JSON)", kind: "textarea", placeholder: '{"INPUT_OT_RATE": 100, "BONUS": 1500}', description: "Optional numeric variables applied to every matched employee. New custom names must start with INPUT_; employee salary overrides still take precedence.", className: "sm:col-span-2" },
      ]}
    >
      <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-slate-50/70 p-4 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2 text-sm font-semibold">{scopeLoading ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4 text-primary" />}Scope preview</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{scopeReady ? matches.length : "—"}</p>
          <p className="text-xs text-muted-foreground">{scopeReady ? `${employees.length} eligible employee${employees.length === 1 ? "" : "s"} available before period validation.` : "Select a factory and pay group to load employees."}</p>
        </div>
        <div className="rounded-xl border bg-slate-50/70 p-4 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2 text-sm font-semibold"><Calculator className="size-4 text-primary" />Formula context</div>
          <div className="mt-2 flex max-h-16 flex-wrap gap-1 overflow-hidden">
            {(scopeOptions?.formulaVariables ?? ["BASE", "PAYABLE_DAYS", "UNPAID_LEAVE_DAYS", "OVERTIME_HOURS", "LOAN_DEDUCTION"]).slice(0, 10).map((variable) => <Badge key={variable} variant="outline" className="rounded-md font-mono text-[10px]">{variable}</Badge>)}
          </div>
        </div>
      </div>
    </HrFormDialog>
  )
}

export type PayrollFormValues = PayrollEntryFormValues
export const PayrollFormDialog = PayrollEntryForm
