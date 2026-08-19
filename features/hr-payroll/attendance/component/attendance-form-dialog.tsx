"use client"

import { HrFormDialog, type HrFormField, type HrFormValues } from "../../shared/hr-form-dialog"
import type { HrOption } from "../../shared/hr.types"

export type AttendanceMode = "derive" | "punch" | "credential" | "revoke" | "correction" | "correction-decision" | "overtime" | "overtime-decision"
export type AttendanceFormValues = HrFormValues

const MODE_COPY: Record<AttendanceMode, { title: string; description: string; submit: string }> = {
  derive: { title: "Derive attendance", description: "Calculate attendance days from punches, rosters, leave, and holidays.", submit: "Run derivation" },
  punch: { title: "Record manual punch", description: "Submit a manual attendance event for an employee.", submit: "Record punch" },
  credential: { title: "Create integration credential", description: "Generate a one-time credential for an attendance source.", submit: "Create credential" },
  revoke: { title: "Revoke integration credential", description: "Disable a credential by its identifier.", submit: "Revoke credential" },
  correction: { title: "Request correction", description: "Request updates to a finalized attendance-day record.", submit: "Request correction" },
  "correction-decision": { title: "Decide correction", description: "Approve or reject a pending attendance correction.", submit: "Record decision" },
  overtime: { title: "Request overtime", description: "Submit overtime against a present attendance day.", submit: "Request overtime" },
  "overtime-decision": { title: "Decide overtime", description: "Approve or reject a pending overtime request.", submit: "Record decision" },
}

function fields(mode: AttendanceMode, employees: HrOption[]): HrFormField[] {
  switch (mode) {
    case "derive": return [{ name: "dateFrom", label: "Date from", kind: "date", required: true }, { name: "dateTo", label: "Date to", kind: "date", required: true }, { name: "employeeId", label: "Employee", kind: "select", options: [{ value: "__all__", label: "All active employees" }, ...employees] }, { name: "finalize", label: "Finalize results", kind: "switch", description: "Finalized days require a correction request before changes." }]
    case "punch": return [{ name: "employeeId", label: "Employee", kind: "select", required: true, options: employees, className: "sm:col-span-2" }, { name: "externalEventId", label: "External event ID", required: true }, { name: "punchedAt", label: "Punch time", kind: "datetime-local", required: true }, { name: "direction", label: "Direction", kind: "select", options: [{ value: "IN", label: "In" }, { value: "OUT", label: "Out" }, { value: "UNKNOWN", label: "Unknown" }] }, { name: "deviceIdentifier", label: "Device identifier" }]
    case "credential": return [{ name: "source", label: "Source", required: true, placeholder: "BIOMETRIC_GATE_1" }, { name: "allowedIps", label: "Allowed IPs", placeholder: "10.0.0.10, 10.0.0.11", description: "Optional comma-separated IP allowlist." }]
    case "revoke": return [{ name: "recordId", label: "Credential ID", required: true, className: "sm:col-span-2" }]
    case "correction": return [{ name: "recordId", label: "Attendance day ID", required: true, className: "sm:col-span-2" }, { name: "requestedValues", label: "Requested values (JSON)", kind: "textarea", required: true, placeholder: '{"firstIn":"2026-08-19T08:00:00+06:00"}', className: "sm:col-span-2" }, { name: "reason", label: "Reason", kind: "textarea", required: true, className: "sm:col-span-2" }]
    case "correction-decision": return decisionFields("Correction ID")
    case "overtime": return [{ name: "employeeId", label: "Employee", kind: "select", required: true, options: employees, className: "sm:col-span-2" }, { name: "workDate", label: "Work date", kind: "date", required: true }, { name: "requestedMinutes", label: "Requested minutes", kind: "number", required: true, min: 1 }, { name: "reason", label: "Reason", kind: "textarea", className: "sm:col-span-2" }]
    case "overtime-decision": return [...decisionFields("Overtime request ID"), { name: "approvedMinutes", label: "Approved minutes", kind: "number", min: 1, description: "Optional override when approving overtime." }]
  }
}

function decisionFields(label: string): HrFormField[] { return [{ name: "recordId", label, required: true, className: "sm:col-span-2" }, { name: "decision", label: "Decision", kind: "select", required: true, options: [{ value: "APPROVED", label: "Approve" }, { value: "REJECTED", label: "Reject" }] }, { name: "rowVersion", label: "Row version", kind: "number", required: true, min: 1 }, { name: "comment", label: "Comment", kind: "textarea", className: "sm:col-span-2" }] }

export function AttendanceFormDialog({ open, mode, values, employees, submitting, error, onOpenChange, onChange, onSubmit }: { open: boolean; mode: AttendanceMode; values: AttendanceFormValues; employees: HrOption[]; submitting: boolean; error: string; onOpenChange: (open: boolean) => void; onChange: (name: string, value: AttendanceFormValues[string]) => void; onSubmit: () => void }) {
  const copy = MODE_COPY[mode]
  return <HrFormDialog open={open} title={copy.title} description={copy.description} values={values} fields={fields(mode, employees)} submitting={submitting} error={error} submitLabel={copy.submit} onOpenChange={onOpenChange} onChange={onChange} onSubmit={onSubmit} />
}

