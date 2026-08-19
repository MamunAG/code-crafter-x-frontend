"use client"

import { HrFormDialog, type HrFormValues } from "../../shared/hr-form-dialog"

export type ShiftFormValues = HrFormValues & {
  code: string
  name: string
  startTime: string
  endTime: string
  breakMinutes: number
  graceInMinutes: number
  graceOutMinutes: number
  overtimeAfterMinutes: number
  isOvernight: boolean
  isFlexible: boolean
}

export function ShiftFormDialog({
  open,
  values,
  submitting,
  error,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean
  values: ShiftFormValues
  submitting: boolean
  error: string
  onOpenChange: (open: boolean) => void
  onChange: (name: string, value: ShiftFormValues[string]) => void
  onSubmit: () => void
}) {
  return (
    <HrFormDialog
      open={open}
      title="Create shift"
      description="Define working hours, grace periods, and overtime rules."
      values={values}
      submitting={submitting}
      error={error}
      submitLabel="Save shift"
      onOpenChange={onOpenChange}
      onChange={onChange}
      onSubmit={onSubmit}
      fields={[
        { name: "code", label: "Code", required: true, placeholder: "DAY" },
        {
          name: "name",
          label: "Shift name",
          required: true,
          placeholder: "Day shift",
        },
        {
          name: "startTime",
          label: "Start time",
          kind: "time",
          required: true,
        },
        { name: "endTime", label: "End time", kind: "time", required: true },
        {
          name: "breakMinutes",
          label: "Break minutes",
          kind: "number",
          min: 0,
        },
        {
          name: "overtimeAfterMinutes",
          label: "Overtime after",
          kind: "number",
          min: 0,
          description: "Minutes worked before overtime begins.",
        },
        {
          name: "graceInMinutes",
          label: "Arrival grace",
          kind: "number",
          min: 0,
        },
        {
          name: "graceOutMinutes",
          label: "Departure grace",
          kind: "number",
          min: 0,
        },
        {
          name: "isOvernight",
          label: "Overnight shift",
          kind: "switch",
          description: "The shift ends on the following calendar day.",
        },
        {
          name: "isFlexible",
          label: "Flexible hours",
          kind: "switch",
          description: "Working times may vary within this shift.",
        },
      ]}
    />
  )
}
