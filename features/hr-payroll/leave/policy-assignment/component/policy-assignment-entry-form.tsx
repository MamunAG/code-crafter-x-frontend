"use client"

import { Loader2 } from "lucide-react"

import { AppSelect } from "@/components/app-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import type { MasterDataFormValues } from "../../../master-data/master-data.types"
import type { HrOption } from "../../../shared/hr.types"

type Props = {
  open: boolean
  mode: "create" | "edit"
  values: MasterDataFormValues
  employees: HrOption[]
  policies: HrOption[]
  submitting: boolean
  error: string
  onOpenChange: (value: boolean) => void
  onChange: (value: MasterDataFormValues) => void
  onSubmit: () => void
}

export function PolicyAssignmentEntryForm({
  open,
  mode,
  values,
  employees,
  policies,
  submitting,
  error,
  onOpenChange,
  onChange,
  onSubmit,
}: Props) {
  const updateSetting = (key: string, value: unknown) =>
    onChange({ ...values, settings: { ...values.settings, [key]: value } })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create policy assignment" : "Edit policy assignment"}
          </DialogTitle>
          <DialogDescription>
            The backend rejects overlapping effective periods for the same employee.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Code *</Label>
            <Input
              value={values.code}
              disabled={mode === "edit"}
              onChange={(event) =>
                onChange({ ...values, code: event.target.value.toUpperCase() })
              }
              placeholder="POL-ASG-001"
            />
          </div>
          <div>
            <Label>Name *</Label>
            <Input
              value={values.name}
              onChange={(event) => onChange({ ...values, name: event.target.value })}
              placeholder="Employee policy assignment"
            />
          </div>
          <div>
            <Label>Employee *</Label>
            <AppSelect
              value={String(values.settings.employeeId ?? "")}
              onValueChange={(value) => updateSetting("employeeId", value)}
              options={employees}
              placeholder="Select employee"
              triggerClassName="mt-1 h-9"
            />
          </div>
          <div>
            <Label>Leave policy *</Label>
            <AppSelect
              value={String(values.settings.policyId ?? "")}
              onValueChange={(value) => updateSetting("policyId", value)}
              options={policies}
              placeholder="Select policy"
              triggerClassName="mt-1 h-9"
            />
          </div>
          <div>
            <Label>Effective from *</Label>
            <Input
              type="date"
              value={String(values.settings.effectiveFrom ?? "")}
              onChange={(event) => updateSetting("effectiveFrom", event.target.value)}
            />
          </div>
          <div>
            <Label>Effective to</Label>
            <Input
              type="date"
              min={String(values.settings.effectiveFrom ?? "")}
              value={String(values.settings.effectiveTo ?? "")}
              onChange={(event) => updateSetting("effectiveTo", event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <Switch
              checked={values.settings.active !== false}
              onCheckedChange={(value) => updateSetting("active", value)}
            />
            Active assignment
          </label>
          {error ? (
            <Alert variant="destructive" className="sm:col-span-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={submitting} onClick={onSubmit}>
            {submitting ? <Loader2 className="animate-spin" /> : null}
            Save assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
