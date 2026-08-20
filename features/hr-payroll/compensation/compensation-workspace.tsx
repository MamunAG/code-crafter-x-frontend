"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ActiveCompensationSection } from "./component/active-compensation-section"
import {
  CompensationEntryForm,
  type CompensationEntryFormValues,
  type CompensationMode,
} from "./component/compensation-entry-form"
import { DeletedCompensationSection } from "./component/deleted-compensation-section"
import {
  activateSalaryStructure,
  assignSalary,
  createSalaryStructure,
  listSalaryStructures,
  loadLookupOptions,
} from "../operations/operations.service"
import type {
  SalaryAssignmentRecord,
  SalaryStructureRecord,
} from "../operations/operations.types"
import { HrConfirmDialog } from "../shared/hr-confirm-dialog"
import { HrPageHeader } from "../shared/hr-page-header"
import type { HrOption } from "../shared/hr.types"
import { HrWorkspaceLayout } from "../shared/hr-workspace-layout"
import { useHrWorkspace } from "../shared/use-hr-workspace"

const COMPONENT_EXAMPLE = JSON.stringify(
  [
    {
      code: "BASIC",
      name: "Basic salary",
      type: "EARNING",
      formula: "BASE",
      sortOrder: 1,
      isTaxable: true,
    },
  ],
  null,
  2
)
function defaults(mode: CompensationMode): CompensationEntryFormValues {
  return mode === "structure"
    ? {
        code: "",
        name: "",
        effectiveFrom: "",
        effectiveTo: "",
        components: COMPONENT_EXAMPLE,
      }
    : {
        employeeId: "",
        salaryStructureId: "",
        effectiveFrom: "",
        effectiveTo: "",
        baseAmount: 0,
        currency: "BDT",
        componentOverrides: "{}",
      }
}
export function CompensationWorkspace({ apiUrl }: { apiUrl: string }) {
  const {
    organizationId,
    context,
    handleError,
    refreshVersion,
    triggerRefresh,
  } = useHrWorkspace(apiUrl)
  const [structures, setStructures] = useState<SalaryStructureRecord[]>([])
  const [assignments, setAssignments] = useState<SalaryAssignmentRecord[]>([])
  const [employees, setEmployees] = useState<HrOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [mode, setMode] = useState<CompensationMode>("structure")
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<CompensationEntryFormValues>(() =>
    defaults("structure")
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [activationTarget, setActivationTarget] =
    useState<SalaryStructureRecord | null>(null)
  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [items, lookups] = await Promise.all([
        listSalaryStructures(context()),
        loadLookupOptions(context(), ["employees"]),
      ])
      setStructures(items)
      setEmployees(
        lookups.employees.map((item) => ({
          value: item.id,
          label: `${item.employeeCode ?? ""} · ${item.employeeName ?? item.id}`,
        }))
      )
    } catch (caught) {
      handleError(caught, "Unable to load compensation data.")
    } finally {
      setLoading(false)
    }
  }, [context, handleError, organizationId])
  useEffect(() => {
    const pending = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(pending)
  }, [load, refreshVersion])
  const openMode = (next: CompensationMode) => {
    setMode(next)
    setValues(defaults(next))
    setError("")
    setOpen(true)
  }
  const submit = async () => {
    setSubmitting(true)
    setError("")
    try {
      if (mode === "structure") {
        const components = JSON.parse(String(values.components))
        if (!Array.isArray(components) || !components.length)
          throw new Error("Components must be a non-empty JSON array.")
        await createSalaryStructure(context(), {
          code: String(values.code).trim().toUpperCase(),
          name: String(values.name).trim(),
          effectiveFrom: values.effectiveFrom,
          effectiveTo: values.effectiveTo || undefined,
          components,
        })
      } else {
        const componentOverrides = JSON.parse(
          String(values.componentOverrides || "{}")
        )
        const saved = await assignSalary(context(), {
          employeeId: values.employeeId,
          salaryStructureId: values.salaryStructureId,
          effectiveFrom: values.effectiveFrom,
          effectiveTo: values.effectiveTo || undefined,
          baseAmount: Number(values.baseAmount),
          currency: String(values.currency).trim().toUpperCase(),
          componentOverrides,
        })
        setAssignments((current) => [saved, ...current])
      }
      toast.success(
        mode === "structure"
          ? "Salary structure created."
          : "Salary assigned successfully."
      )
      setOpen(false)
      triggerRefresh()
    } catch (caught) {
      const message =
        caught instanceof SyntaxError
          ? "Components and overrides must contain valid JSON."
          : handleError(caught, "Unable to save compensation data.", false)
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }
  const activate = async () => {
    if (!activationTarget) return
    setSubmitting(true)
    try {
      await activateSalaryStructure(context(), activationTarget.id)
      toast.success("Salary structure activated.")
      setActivationTarget(null)
      triggerRefresh()
    } catch (caught) {
      handleError(caught, "Unable to activate the structure.")
    } finally {
      setSubmitting(false)
    }
  }
  const options = structures.map((item) => ({
    value: item.id,
    label: `${item.code} · ${item.name} v${item.version}${item.isActive ? " (active)" : ""}`,
  }))
  const active = useMemo(
    () => structures.filter((item) => item.isActive).length,
    [structures]
  )
  return (
    <HrWorkspaceLayout>
      <HrPageHeader
        title="Compensation Setup"
        description="Build versioned salary formula structures and assign effective-dated compensation to employees."
        badges={[
          { label: `${structures.length} structures`, variant: "secondary" },
          { label: `${active} active` },
          { label: `${assignments.length} assigned this session` },
        ]}
        onRefresh={triggerRefresh}
        onCreate={() => openMode("structure")}
        createLabel="New structure"
        actions={
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => openMode("assignment")}
          >
            Assign salary
          </Button>
        }
      />
      <ActiveCompensationSection
        data={structures}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        onActivate={setActivationTarget}
      />
      <DeletedCompensationSection data={assignments} employees={employees} />
      <CompensationEntryForm
        open={open}
        mode={mode}
        values={values}
        employees={employees}
        structures={options}
        submitting={submitting}
        error={error}
        onOpenChange={setOpen}
        onChange={(name, value) =>
          setValues((current) => ({ ...current, [name]: value }))
        }
        onSubmit={submit}
      />
      <HrConfirmDialog
        open={Boolean(activationTarget)}
        title="Activate salary structure"
        description="Activation locks this version and makes it available to payroll. Continue?"
        confirmLabel="Activate"
        working={submitting}
        onOpenChange={(next) => {
          if (!next) setActivationTarget(null)
        }}
        onConfirm={activate}
      />
    </HrWorkspaceLayout>
  )
}
