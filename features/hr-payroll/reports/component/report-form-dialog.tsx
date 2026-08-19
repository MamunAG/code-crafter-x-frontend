"use client"

import { HrFormDialog, type HrFormValues } from "../../shared/hr-form-dialog"
import type { HrOption } from "../../shared/hr.types"
export type ReportMode = "report" | "payslips"
export type ReportFormValues = HrFormValues & { type: string; dateFrom: string; dateTo: string; factoryId: string; employeeId: string; format: string; language: string; payrollRunId: string }
const REPORT_TYPES = ["attendance", "overtime", "headcount", "salary-history", "leave", "loans", "payroll-register", "payroll-variance", "deductions", "tax", "provident-fund", "gratuity", "final-settlements"]
export function ReportFormDialog({ open, mode, values, employees, factories, submitting, error, onOpenChange, onChange, onSubmit }: { open: boolean; mode: ReportMode; values: ReportFormValues; employees: HrOption[]; factories: HrOption[]; submitting: boolean; error: string; onOpenChange: (open: boolean) => void; onChange: (name: string, value: ReportFormValues[string]) => void; onSubmit: () => void }) {
  const fields = mode === "payslips" ? [{ name: "payrollRunId", label: "Locked payroll run ID", required: true, className: "sm:col-span-2" }, { name: "language", label: "Language", kind: "select" as const, options: [{ value: "en", label: "English" }, { value: "bn", label: "Bangla" }], className: "sm:col-span-2" }] : [
    { name: "type", label: "Report", kind: "select" as const, required: true, options: REPORT_TYPES.map((value) => ({ value, label: value.replaceAll("-", " ") })) }, { name: "format", label: "Output", kind: "select" as const, options: [{ value: "json", label: "On-screen table" }, { value: "xlsx", label: "Excel download" }, { value: "pdf", label: "PDF download" }] },
    { name: "dateFrom", label: "Date from", kind: "date" as const }, { name: "dateTo", label: "Date to", kind: "date" as const },
    { name: "factoryId", label: "Factory", kind: "select" as const, options: [{ value: "__all__", label: "All factories" }, ...factories] }, { name: "employeeId", label: "Employee", kind: "select" as const, options: [{ value: "__all__", label: "All employees" }, ...employees] },
    { name: "language", label: "Language", kind: "select" as const, options: [{ value: "en", label: "English" }, { value: "bn", label: "Bangla" }], className: "sm:col-span-2" },
  ]
  return <HrFormDialog open={open} title={mode === "payslips" ? "Download bulk payslips" : "Generate HR report"} description={mode === "payslips" ? "Download one PDF containing payslips for a locked payroll run." : "Preview a report on screen or export it to Excel or PDF."} values={values} fields={fields} submitting={submitting} error={error} submitLabel={mode === "payslips" ? "Download payslips" : values.format === "json" ? "Run report" : "Download report"} onOpenChange={onOpenChange} onChange={onChange} onSubmit={onSubmit} />
}

