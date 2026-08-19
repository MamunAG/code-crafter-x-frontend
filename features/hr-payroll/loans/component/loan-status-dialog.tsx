"use client"

import { HrFormDialog, type HrFormValues } from "../../shared/hr-form-dialog"
export type LoanStatusValues = HrFormValues & { status: string }
export function LoanStatusDialog({ open, values, submitting, error, onOpenChange, onChange, onSubmit }: { open: boolean; values: LoanStatusValues; submitting: boolean; error: string; onOpenChange: (open: boolean) => void; onChange: (name: string, value: LoanStatusValues[string]) => void; onSubmit: () => void }) {
  return <HrFormDialog open={open} title="Change loan status" description="Move the loan through its controlled lifecycle." values={values} submitting={submitting} error={error} submitLabel="Update status" onOpenChange={onOpenChange} onChange={onChange} onSubmit={onSubmit} fields={[{ name: "status", label: "New status", kind: "select", required: true, options: ["DRAFT", "APPROVED", "ACTIVE", "PAUSED", "SETTLED", "CANCELLED"].map((value) => ({ value, label: value.replaceAll("_", " ") })), className: "sm:col-span-2" }]} />
}

