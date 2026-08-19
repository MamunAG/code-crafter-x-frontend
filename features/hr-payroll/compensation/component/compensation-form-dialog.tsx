"use client"

import { HrFormDialog, type HrFormValues } from "../../shared/hr-form-dialog"
import type { HrOption } from "../../shared/hr.types"

export type CompensationMode = "structure" | "assignment"
export type CompensationFormValues = HrFormValues
export function CompensationFormDialog({ open, mode, values, employees, structures, submitting, error, onOpenChange, onChange, onSubmit }: { open: boolean; mode: CompensationMode; values: CompensationFormValues; employees: HrOption[]; structures: HrOption[]; submitting: boolean; error: string; onOpenChange: (open: boolean) => void; onChange: (name: string, value: CompensationFormValues[string]) => void; onSubmit: () => void }) {
  const structureFields = [
    { name: "code", label: "Structure code", required: true, placeholder: "MONTHLY-STAFF" }, { name: "name", label: "Structure name", required: true, placeholder: "Monthly staff" },
    { name: "effectiveFrom", label: "Effective from", kind: "date" as const, required: true }, { name: "effectiveTo", label: "Effective to", kind: "date" as const },
    { name: "components", label: "Components (JSON)", kind: "textarea" as const, required: true, className: "sm:col-span-2", description: "Array fields: code, name, type, formula, optional nameBn, sortOrder, isTaxable." },
  ]
  const assignmentFields = [
    { name: "employeeId", label: "Employee", kind: "select" as const, required: true, options: employees, className: "sm:col-span-2" },
    { name: "salaryStructureId", label: "Salary structure", kind: "select" as const, required: true, options: structures, className: "sm:col-span-2" },
    { name: "effectiveFrom", label: "Effective from", kind: "date" as const, required: true }, { name: "effectiveTo", label: "Effective to", kind: "date" as const },
    { name: "baseAmount", label: "Base amount", kind: "number" as const, min: 0, required: true }, { name: "currency", label: "Currency", placeholder: "BDT", required: true },
    { name: "componentOverrides", label: "Component overrides (JSON)", kind: "textarea" as const, className: "sm:col-span-2", placeholder: '{"HOUSE_RENT":15000}' },
  ]
  return <HrFormDialog open={open} title={mode === "structure" ? "Create salary structure" : "Assign employee salary"} description={mode === "structure" ? "Create an effective-dated, versioned formula structure." : "Assign an active salary structure and base amount to an employee."} values={values} fields={mode === "structure" ? structureFields : assignmentFields} submitting={submitting} error={error} submitLabel={mode === "structure" ? "Save structure" : "Assign salary"} onOpenChange={onOpenChange} onChange={onChange} onSubmit={onSubmit} />
}

