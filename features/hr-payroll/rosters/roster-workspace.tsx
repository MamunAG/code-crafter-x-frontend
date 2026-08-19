"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { ActiveRostersSection } from "./component/active-rosters-section"
import { DeletedRostersSection } from "./component/deleted-rosters-section"
import {
  RosterFormDialog,
  type RosterFormValues,
} from "./component/roster-form-dialog"
import {
  createRoster,
  loadLookupOptions,
} from "../operations/operations.service"
import type { RosterRecord } from "../operations/operations.types"
import { HrPageHeader } from "../shared/hr-page-header"
import type { HrOption } from "../shared/hr.types"
import { HrWorkspaceLayout } from "../shared/hr-workspace-layout"
import { useHrWorkspace } from "../shared/use-hr-workspace"

const DEFAULT_VALUES: RosterFormValues = {
  employeeId: "",
  shiftId: "",
  effectiveFrom: "",
  effectiveTo: "",
  weeklyOffDays: "5",
}
export function RosterWorkspace({ apiUrl }: { apiUrl: string }) {
  const { organizationId, context, handleError } = useHrWorkspace(apiUrl)
  const [records, setRecords] = useState<RosterRecord[]>([])
  const [employees, setEmployees] = useState<HrOption[]>([])
  const [shifts, setShifts] = useState<HrOption[]>([])
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<RosterFormValues>(DEFAULT_VALUES)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const load = useCallback(async () => {
    if (!organizationId) return
    try {
      const result = await loadLookupOptions(context(), ["employees", "shifts"])
      setEmployees(
        result.employees.map((item) => ({
          value: item.id,
          label: `${item.employeeCode ?? ""} · ${item.employeeName ?? item.id}`,
        }))
      )
      setShifts(
        result.shifts.map((item) => ({
          value: item.id,
          label: `${item.code} · ${item.name}`,
        }))
      )
    } catch (caught) {
      handleError(caught, "Unable to load roster options.")
    }
  }, [context, handleError, organizationId])
  useEffect(() => {
    const pending = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(pending)
  }, [load])
  const submit = async () => {
    if (!values.employeeId || !values.shiftId || !values.effectiveFrom) {
      setError("Employee, shift, and effective-from date are required.")
      return
    }
    const weeklyOffDays = values.weeklyOffDays
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    if (!weeklyOffDays.length) {
      setError("Enter at least one valid weekly-off day from 0 to 6.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const saved = await createRoster(context(), {
        employeeId: values.employeeId,
        shiftId: values.shiftId,
        effectiveFrom: values.effectiveFrom,
        effectiveTo: values.effectiveTo || undefined,
        weeklyOffDays,
      })
      setRecords((current) => [saved, ...current])
      toast.success("Roster assigned successfully.")
      setOpen(false)
      setValues(DEFAULT_VALUES)
    } catch (caught) {
      setError(handleError(caught, "Unable to assign the roster.", false))
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <HrWorkspaceLayout>
      <HrPageHeader
        title="Roster Management"
        description="Assign effective-dated shifts and weekly-off patterns without overlapping employee rosters."
        badges={[
          {
            label: `${records.length} assigned this session`,
            variant: "secondary",
          },
        ]}
        onCreate={() => {
          setValues(DEFAULT_VALUES)
          setError("")
          setOpen(true)
        }}
        createLabel="Assign roster"
      />
      <ActiveRostersSection
        data={records}
        employeeOptions={employees}
        shiftOptions={shifts}
      />
      <DeletedRostersSection />
      <RosterFormDialog
        open={open}
        values={values}
        employees={employees}
        shifts={shifts}
        submitting={submitting}
        error={error}
        onOpenChange={setOpen}
        onChange={(name, value) =>
          setValues((current) => ({ ...current, [name]: value }))
        }
        onSubmit={submit}
      />
    </HrWorkspaceLayout>
  )
}
