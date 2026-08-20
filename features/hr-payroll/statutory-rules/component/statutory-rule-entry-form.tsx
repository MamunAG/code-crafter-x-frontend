"use client"

import { HrFormDialog, type HrFormValues } from "../../shared/hr-form-dialog"

export type StatutoryRuleEntryFormValues = HrFormValues & {
  code: string
  name: string
  jurisdiction: string
  effectiveFrom: string
  effectiveTo: string
  rules: string
  sourceUrl: string
  sourcePublishedAt: string
}

type Props = {
  open: boolean
  values: StatutoryRuleEntryFormValues
  submitting: boolean
  error: string
  onOpenChange: (open: boolean) => void
  onChange: (name: string, value: StatutoryRuleEntryFormValues[string]) => void
  onSubmit: () => void
}

export function StatutoryRuleEntryForm({
  open,
  values,
  submitting,
  error,
  onOpenChange,
  onChange,
  onSubmit,
}: Props) {
  return (
    <HrFormDialog
      open={open}
      title="Create statutory rule pack"
      description="Create a versioned policy pack with source provenance for legal review."
      values={values}
      submitting={submitting}
      error={error}
      submitLabel="Save draft rule pack"
      onOpenChange={onOpenChange}
      onChange={onChange}
      onSubmit={onSubmit}
      fields={[
        { name: "code", label: "Code", required: true, placeholder: "BD-2026" },
        { name: "name", label: "Name", required: true },
        { name: "jurisdiction", label: "Jurisdiction", required: true, placeholder: "BD" },
        {
          name: "sourceUrl",
          label: "Source URL",
          required: true,
          placeholder: "https://...",
        },
        { name: "effectiveFrom", label: "Effective from", kind: "date", required: true },
        { name: "effectiveTo", label: "Effective to", kind: "date" },
        { name: "sourcePublishedAt", label: "Source published", kind: "date" },
        {
          name: "rules",
          label: "Rules (JSON)",
          kind: "textarea",
          required: true,
          className: "sm:col-span-2",
          description: "Enter the verified rule configuration as a JSON object.",
        },
      ]}
    />
  )
}

export type StatutoryRuleFormValues = StatutoryRuleEntryFormValues
export const StatutoryRuleFormDialog = StatutoryRuleEntryForm
