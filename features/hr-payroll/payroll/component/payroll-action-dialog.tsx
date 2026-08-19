"use client"

import { HrFormDialog, type HrFormValues } from "../../shared/hr-form-dialog"
export type PayrollAction = "calculate" | "submit-review" | "approve" | "lock" | "reject" | "reverse" | "paid"
export type PayrollActionValues = HrFormValues & { comment: string; paidStatus: string }
const TITLES: Record<PayrollAction, string> = { calculate: "Calculate payroll", "submit-review": "Submit payroll for review", approve: "Approve payroll", lock: "Lock payroll", reject: "Reject payroll", reverse: "Reverse payroll", paid: "Update paid status" }
export function PayrollActionDialog({ open, action, values, submitting, error, onOpenChange, onChange, onSubmit }: { open: boolean; action: PayrollAction; values: PayrollActionValues; submitting: boolean; error: string; onOpenChange: (open: boolean) => void; onChange: (name: string, value: PayrollActionValues[string]) => void; onSubmit: () => void }) {
  return <HrFormDialog open={open} title={TITLES[action]} description={action === "lock" ? "Locking finalizes the approved payroll and enables payslips." : action === "reverse" ? "Create a linked reversing payroll run for this locked run." : "Apply this controlled transition using the latest row version."} values={values} submitting={submitting} error={error} submitLabel={TITLES[action]} onOpenChange={onOpenChange} onChange={onChange} onSubmit={onSubmit} fields={action === "paid" ? [{ name: "paidStatus", label: "Paid status", kind: "select", required: true, options: [{ value: "UNPAID", label: "Unpaid" }, { value: "PARTIALLY_PAID", label: "Partially paid" }, { value: "PAID", label: "Paid" }], className: "sm:col-span-2" }] : [{ name: "comment", label: "Workflow comment", kind: "textarea", className: "sm:col-span-2" }]} />
}

