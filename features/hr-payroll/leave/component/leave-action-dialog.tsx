"use client"

import { HrFormDialog, type HrFormValues } from "../../shared/hr-form-dialog"

export type LeaveActionValues = HrFormValues & { decision: string; comment: string }
export function LeaveActionDialog({ open, mode, values, submitting, error, onOpenChange, onChange, onSubmit }: { open: boolean; mode: "decision" | "cancel"; values: LeaveActionValues; submitting: boolean; error: string; onOpenChange: (open: boolean) => void; onChange: (name: string, value: LeaveActionValues[string]) => void; onSubmit: () => void }) {
  return <HrFormDialog open={open} title={mode === "decision" ? "Record leave decision" : "Cancel leave request"} description={mode === "decision" ? "Approve or reject this request using its current row version." : "Cancel the selected pending or approved request."} values={values} submitting={submitting} error={error} submitLabel={mode === "decision" ? "Record decision" : "Cancel request"} onOpenChange={onOpenChange} onChange={onChange} onSubmit={onSubmit} fields={[
    ...(mode === "decision" ? [{ name: "decision", label: "Decision", kind: "select" as const, required: true, options: [{ value: "APPROVED", label: "Approve" }, { value: "REJECTED", label: "Reject" }], className: "sm:col-span-2" }] : []),
    { name: "comment", label: "Comment", kind: "textarea", placeholder: "Optional audit comment", className: "sm:col-span-2" },
  ]} />
}

