"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ActiveShiftsSection } from "./component/active-shifts-section"
import { DeletedShiftsSection } from "./component/deleted-shifts-section"
import {
  ShiftFormDialog,
  type ShiftFormValues,
} from "./component/shift-form-dialog"
import { createShift, listShifts } from "../operations/operations.service"
import type { ShiftRecord } from "../operations/operations.types"
import { HrPageHeader } from "../shared/hr-page-header"
import { HrWorkspaceLayout } from "../shared/hr-workspace-layout"
import { useHrWorkspace } from "../shared/use-hr-workspace"

const DEFAULT_VALUES: ShiftFormValues = {
  code: "",
  name: "",
  startTime: "08:00",
  endTime: "17:00",
  breakMinutes: 60,
  graceInMinutes: 0,
  graceOutMinutes: 0,
  overtimeAfterMinutes: 0,
  isOvernight: false,
  isFlexible: false,
}

export function ShiftWorkspace({ apiUrl }: { apiUrl: string }) {
  const {
    organizationId,
    context,
    handleError,
    refreshVersion,
    triggerRefresh,
  } = useHrWorkspace(apiUrl)
  const [records, setRecords] = useState<ShiftRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<ShiftFormValues>(DEFAULT_VALUES)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const load = useCallback(async () => {
    if (!organizationId) {
      setRecords([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setRecords(await listShifts(context()))
    } catch (caught) {
      handleError(caught, "Unable to load shifts.")
    } finally {
      setLoading(false)
    }
  }, [context, handleError, organizationId])
  useEffect(() => {
    const pending = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(pending)
  }, [load, refreshVersion])
  const submit = async () => {
    if (
      !values.code.trim() ||
      !values.name.trim() ||
      !values.startTime ||
      !values.endTime
    ) {
      setError("Code, name, start time, and end time are required.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      await createShift(context(), {
        ...values,
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
      })
      toast.success("Shift created successfully.")
      setOpen(false)
      setValues(DEFAULT_VALUES)
      triggerRefresh()
    } catch (caught) {
      setError(handleError(caught, "Unable to create the shift.", false))
    } finally {
      setSubmitting(false)
    }
  }
  const active = useMemo(
    () => records.filter((record) => record.isActive).length,
    [records]
  )
  return (
    <HrWorkspaceLayout>
      <HrPageHeader
        title="Shift Setup"
        description="Define employee work schedules, grace periods, breaks, and overtime thresholds."
        badges={[
          { label: `${records.length} total`, variant: "secondary" },
          { label: `${active} active` },
        ]}
        onRefresh={triggerRefresh}
        onCreate={() => {
          setValues(DEFAULT_VALUES)
          setError("")
          setOpen(true)
        }}
        createLabel="New shift"
      />
      <ActiveShiftsSection
        data={records.filter((record) => record.isActive)}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        onRefresh={triggerRefresh}
        onCreate={() => setOpen(true)}
      />
      <DeletedShiftsSection data={records} />
      <ShiftFormDialog
        open={open}
        values={values}
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
