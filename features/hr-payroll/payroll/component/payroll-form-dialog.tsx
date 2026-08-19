"use client"

import { HrFormDialog, type HrFormValues } from "../../shared/hr-form-dialog"
import type { HrOption } from "../../shared/hr.types"
export type PayrollFormValues = HrFormValues & { factoryId: string; payGroupId: string; frequency: string; runType: string; periodStart: string; periodEnd: string; paymentDate: string; rulePackId: string; currency: string; sequence: number }
export function PayrollFormDialog({ open, values, factories, payGroups, rulePacks, submitting, error, onOpenChange, onChange, onSubmit }: { open: boolean; values: PayrollFormValues; factories: HrOption[]; payGroups: HrOption[]; rulePacks: HrOption[]; submitting: boolean; error: string; onOpenChange: (open: boolean) => void; onChange: (name: string, value: PayrollFormValues[string]) => void; onSubmit: () => void }) {
  return <HrFormDialog open={open} title="Create payroll run" description="Define a unique pay period and create its immutable payroll workflow record." values={values} submitting={submitting} error={error} submitLabel="Create payroll run" onOpenChange={onOpenChange} onChange={onChange} onSubmit={onSubmit} fields={[
    { name: "factoryId", label: "Factory", kind: "select", required: true, options: factories }, { name: "payGroupId", label: "Pay group", kind: "select", required: true, options: payGroups },
    { name: "frequency", label: "Frequency", kind: "select", required: true, options: ["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY"].map((value) => ({ value, label: value })) },
    { name: "runType", label: "Run type", kind: "select", required: true, options: ["REGULAR", "BONUS", "ARREARS", "ADJUSTMENT", "FINAL_SETTLEMENT"].map((value) => ({ value, label: value.replaceAll("_", " ") })) },
    { name: "periodStart", label: "Period start", kind: "date", required: true }, { name: "periodEnd", label: "Period end", kind: "date", required: true },
    { name: "paymentDate", label: "Payment date", kind: "date", required: true }, { name: "sequence", label: "Sequence", kind: "number", min: 1, required: true },
    { name: "rulePackId", label: "Statutory rule pack", kind: "select", options: [{ value: "__none__", label: "Use organization default" }, ...rulePacks] }, { name: "currency", label: "Currency", required: true, placeholder: "BDT" },
  ]} />
}

