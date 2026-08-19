"use client"

import { HrFormDialog, type HrFormValues } from "../../shared/hr-form-dialog"
export type ImportFormValues = HrFormValues & { type: string; file: File | null }
export function ImportFormDialog({ open, values, submitting, error, onOpenChange, onChange, onSubmit }: { open: boolean; values: ImportFormValues; submitting: boolean; error: string; onOpenChange: (open: boolean) => void; onChange: (name: string, value: ImportFormValues[string]) => void; onSubmit: () => void }) {
  return <HrFormDialog open={open} title="Queue HR import" description="Upload the first worksheet from an Excel file. One import can contain up to 10,000 rows." values={values} submitting={submitting} error={error} submitLabel="Queue import" onOpenChange={onOpenChange} onChange={onChange} onSubmit={onSubmit} fields={[
    { name: "type", label: "Import type", kind: "select", required: true, options: ["employee-details", "leave-balances", "loans", "salary-assignments", "payroll-ytd"].map((value) => ({ value, label: value.replaceAll("-", " ") })), className: "sm:col-span-2" },
    { name: "file", label: "Excel file", kind: "file", required: true, accept: ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel", className: "sm:col-span-2" },
  ]} />
}

