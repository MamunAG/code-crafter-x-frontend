"use client"

import { HrFormDialog, type HrFormValues } from "../../shared/hr-form-dialog"
import type { HrOption } from "../../shared/hr.types"

export type RosterFormValues = HrFormValues & {
  employeeId: string
  shiftId: string
  effectiveFrom: string
  effectiveTo: string
  weeklyOffDays: string
}

export function RosterFormDialog({
  open,
  values,
  employees,
  shifts,
  submitting,
  error,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean
  values: RosterFormValues
  employees: HrOption[]
  shifts: HrOption[]
  submitting: boolean
  error: string
  onOpenChange: (open: boolean) => void
  onChange: (name: string, value: RosterFormValues[string]) => void
  onSubmit: () => void
}) {
  return (
    <HrFormDialog
      open={open}
      title="Assign roster"
      description="Assign an effective-dated shift and weekly-off pattern to an employee."
      values={values}
      submitting={submitting}
      error={error}
      submitLabel="Assign roster"
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
        {
          name: "shiftId",
          label: "Shift",
          kind: "select",
          required: true,
          options: shifts,
        },
        {
          name: "weeklyOffDays",
          label: "Weekly-off days",
          required: true,
          placeholder: "5",
          description:
            "Comma-separated weekday numbers: Sunday 0 through Saturday 6.",
        },
        {
          name: "effectiveFrom",
          label: "Effective from",
          kind: "date",
          required: true,
        },
        {
          name: "effectiveTo",
          label: "Effective to",
          kind: "date",
          description: "Leave blank for an open-ended assignment.",
        },
      ]}
    />
  )
}
