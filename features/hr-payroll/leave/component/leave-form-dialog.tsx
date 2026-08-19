"use client"

import { HrFormDialog, type HrFormValues } from "../../shared/hr-form-dialog"
import type { HrOption } from "../../shared/hr.types"

export type LeaveFormValues = HrFormValues & { employeeId: string; leaveTypeId: string; startDate: string; endDate: string; isHalfDay: boolean; reason: string; requiredApprovalLevels: number }
export function LeaveFormDialog({ open, values, employees, leaveTypes, submitting, error, onOpenChange, onChange, onSubmit }: { open: boolean; values: LeaveFormValues; employees: HrOption[]; leaveTypes: HrOption[]; submitting: boolean; error: string; onOpenChange: (open: boolean) => void; onChange: (name: string, value: LeaveFormValues[string]) => void; onSubmit: () => void }) {
  return <HrFormDialog open={open} title="Create leave request" description="Submit an employee leave request for the configured approval workflow." values={values} submitting={submitting} error={error} submitLabel="Submit request" onOpenChange={onOpenChange} onChange={onChange} onSubmit={onSubmit} fields={[
    { name: "employeeId", label: "Employee", kind: "select", required: true, options: employees, className: "sm:col-span-2" },
    { name: "leaveTypeId", label: "Leave type", kind: "select", required: true, options: leaveTypes },
    { name: "requiredApprovalLevels", label: "Approval levels", kind: "number", min: 1, max: 3 },
    { name: "startDate", label: "Start date", kind: "date", required: true },
    { name: "endDate", label: "End date", kind: "date", required: true },
    { name: "isHalfDay", label: "Half-day request", kind: "switch", description: "Charge half a day for this request.", className: "sm:col-span-2" },
    { name: "reason", label: "Reason", kind: "textarea", placeholder: "Optional request reason", className: "sm:col-span-2" },
  ]} />
}

