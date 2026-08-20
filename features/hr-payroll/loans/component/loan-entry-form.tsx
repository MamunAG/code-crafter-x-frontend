"use client"

import { HrFormDialog, type HrFormValues } from "../../shared/hr-form-dialog"
import type { HrOption } from "../../shared/hr.types"

export type LoanEntryFormValues = HrFormValues & {
  employeeId: string
  loanNumber: string
  principal: number
  installmentAmount: number
  startDate: string
  remarks: string
}

type Props = {
  open: boolean
  values: LoanEntryFormValues
  employees: HrOption[]
  submitting: boolean
  error: string
  onOpenChange: (open: boolean) => void
  onChange: (name: string, value: LoanEntryFormValues[string]) => void
  onSubmit: () => void
}

export function LoanEntryForm({
  open,
  values,
  employees,
  submitting,
  error,
  onOpenChange,
  onChange,
  onSubmit,
}: Props) {
  return (
    <HrFormDialog
      open={open}
      title="Create employee loan"
      description="Set the principal, installment amount, and payroll deduction start date."
      values={values}
      submitting={submitting}
      error={error}
      submitLabel="Save loan"
      onOpenChange={onOpenChange}
      onChange={onChange}
      onSubmit={onSubmit}
      fields={[
        {
          name: "employeeId",
          label: "Employee",
          kind: "select",
          required: true,
          options: employees,
          className: "sm:col-span-2",
        },
        { name: "loanNumber", label: "Loan number", required: true },
        {
          name: "startDate",
          label: "Start date",
          kind: "date",
          required: true,
        },
        {
          name: "principal",
          label: "Principal",
          kind: "number",
          min: 0.01,
          step: 0.01,
          required: true,
        },
        {
          name: "installmentAmount",
          label: "Installment amount",
          kind: "number",
          min: 0.01,
          step: 0.01,
          required: true,
        },
        {
          name: "remarks",
          label: "Remarks",
          kind: "textarea",
          className: "sm:col-span-2",
        },
      ]}
    />
  )
}

export type LoanFormValues = LoanEntryFormValues
export const LoanFormDialog = LoanEntryForm
