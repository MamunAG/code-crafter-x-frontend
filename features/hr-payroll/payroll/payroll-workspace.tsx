"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ActivePayrollSection } from "./component/active-payroll-section"
import { DeletedPayrollSection } from "./component/deleted-payroll-section"
import { PayrollActionDialog, type PayrollAction, type PayrollActionValues } from "./component/payroll-action-dialog"
import { PayrollDetailsDialog } from "./component/payroll-details-dialog"
import { PayrollFormDialog, type PayrollFormValues } from "./component/payroll-entry-form"
import { createPayrollRun, getPayrollDetails, getPayrollRun, getPayrollScopeOptions, listPayrollRuns, loadLookupOptions, markPayrollPaid, transitionPayroll } from "../operations/operations.service"
import type { PayrollEmployeeRecord, PayrollRunRecord, PayrollScopeOptions } from "../operations/operations.types"
import { HrPageHeader } from "../shared/hr-page-header"
import type { HrOption, HrPaginationMeta } from "../shared/hr.types"
import { HrWorkspaceLayout } from "../shared/hr-workspace-layout"
import { useHrWorkspace } from "../shared/use-hr-workspace"

const DEFAULT_VALUES: PayrollFormValues = {
  factoryId: "",
  payGroupId: "",
  processingMode: "BULK",
  employeeId: "",
  departmentId: "",
  designationId: "",
  sectionName: "",
  includeAllEligible: true,
  frequency: "MONTHLY",
  runType: "REGULAR",
  periodStart: "",
  periodEnd: "",
  paymentDate: "",
  rulePackId: "__none__",
  currency: "BDT",
  sequence: 1,
  formulaInputsJson: "",
}

function parseFormulaInputs(value: string) {
  if (!value.trim()) return {}
  const parsed: unknown = JSON.parse(value)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Additional formula inputs must be a JSON object.")
  const result: Record<string, number> = {}
  for (const [key, raw] of Object.entries(parsed)) {
    const numeric = typeof raw === "number" ? raw : Number.NaN
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || !Number.isFinite(numeric)) throw new Error(`Formula input ${key} must use a valid variable name and numeric value.`)
    result[key.toUpperCase()] = numeric
  }
  return result
}

export function PayrollWorkspace({ apiUrl }: { apiUrl: string }) {
  const { organizationId, context, handleError, refreshVersion, triggerRefresh } = useHrWorkspace(apiUrl)
  const [records, setRecords] = useState<PayrollRunRecord[]>([])
  const [meta, setMeta] = useState<HrPaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState("")
  const [factories, setFactories] = useState<HrOption[]>([])
  const [payGroups, setPayGroups] = useState<HrOption[]>([])
  const [rulePacks, setRulePacks] = useState<HrOption[]>([])
  const [scopeOptions, setScopeOptions] = useState<PayrollScopeOptions | null>(null)
  const [scopeLoading, setScopeLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<PayrollFormValues>(DEFAULT_VALUES)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [target, setTarget] = useState<PayrollRunRecord | null>(null)
  const [action, setAction] = useState<PayrollAction>("calculate")
  const [actionValues, setActionValues] = useState<PayrollActionValues>({ comment: "", paidStatus: "PAID" })
  const [actionError, setActionError] = useState("")
  const [detailRun, setDetailRun] = useState<PayrollRunRecord | null>(null)
  const [detailEmployees, setDetailEmployees] = useState<PayrollEmployeeRecord[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState("")

  const load = useCallback(async () => {
    if (!organizationId) { setLoading(false); return }
    setLoading(true)
    try {
      const [result, lookups] = await Promise.all([listPayrollRuns(context(), page, limit, search), loadLookupOptions(context(), ["factories", "payGroups", "rulePacks"])])
      setRecords(result.items)
      setMeta(result.meta)
      setFactories(lookups.factories.map((item) => ({ value: item.id, label: `${item.code ?? ""} · ${item.displayName ?? item.name ?? item.id}` })))
      setPayGroups(lookups.payGroups.map((item) => ({ value: item.id, label: `${item.code ?? ""} · ${item.name ?? item.id}` })))
      setRulePacks(lookups.rulePacks.filter((item) => item.reviewStatus === "APPROVED").map((item) => ({ value: item.id, label: `${item.code} · ${item.name} v${item.version}` })))
    } catch (caught) { handleError(caught, "Unable to load payroll runs.") } finally { setLoading(false) }
  }, [context, handleError, limit, organizationId, page, search])

  useEffect(() => { const pending = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(pending) }, [load, refreshVersion])
  useEffect(() => {
    if (!records.some((item) => item.status === "CALCULATING")) return
    const interval = window.setInterval(triggerRefresh, 5000)
    return () => window.clearInterval(interval)
  }, [records, triggerRefresh])
  useEffect(() => {
    if (!open || !organizationId || !values.factoryId || !values.payGroupId) return
    let active = true
    const pending = window.setTimeout(() => {
      setScopeLoading(true)
      void getPayrollScopeOptions(context(), values.factoryId, values.payGroupId)
        .then((result) => { if (active) setScopeOptions(result) })
        .catch((caught) => { if (active) setError(handleError(caught, "Unable to load the payroll scope.", false)) })
        .finally(() => { if (active) setScopeLoading(false) })
    }, 0)
    return () => { active = false; window.clearTimeout(pending) }
  }, [context, handleError, open, organizationId, values.factoryId, values.payGroupId])

  const changeValue = (name: string, value: PayrollFormValues[string]) => {
    if (name === "factoryId" || name === "payGroupId") { setScopeOptions(null); setScopeLoading(false) }
    setValues((current) => {
      const next = { ...current, [name]: value }
      if (name === "factoryId" || name === "payGroupId") Object.assign(next, { employeeId: "", departmentId: "", designationId: "", sectionName: "" })
      if (name === "processingMode") Object.assign(next, { employeeId: "", departmentId: "", designationId: "", sectionName: "", includeAllEligible: value === "BULK" })
      if (name === "includeAllEligible" && value === true) Object.assign(next, { departmentId: "", designationId: "", sectionName: "" })
      return next
    })
  }

  const submit = async () => {
    if (!values.factoryId || !values.payGroupId || !values.periodStart || !values.periodEnd || !values.paymentDate) { setError("Factory, pay group, period, and payment date are required."); return }
    if (values.periodEnd < values.periodStart) { setError("Payroll period end cannot precede its start."); return }
    if (values.processingMode === "INDIVIDUAL" && !values.employeeId) { setError("Select an employee for individual salary processing."); return }
    if (values.processingMode === "BULK" && !values.includeAllEligible && !values.departmentId && !values.sectionName && !values.designationId) { setError("Select a department, section, or designation, or include all eligible employees."); return }
    setSubmitting(true)
    setError("")
    try {
      const formulaInputs = parseFormulaInputs(values.formulaInputsJson)
      await createPayrollRun(context(), {
        factoryId: values.factoryId,
        payGroupId: values.payGroupId,
        processingMode: values.processingMode,
        employeeId: values.processingMode === "INDIVIDUAL" ? values.employeeId : undefined,
        departmentId: values.processingMode === "BULK" && !values.includeAllEligible ? values.departmentId || undefined : undefined,
        designationId: values.processingMode === "BULK" && !values.includeAllEligible ? values.designationId || undefined : undefined,
        sectionName: values.processingMode === "BULK" && !values.includeAllEligible ? values.sectionName || undefined : undefined,
        includeAllEligible: values.processingMode === "BULK" ? values.includeAllEligible : undefined,
        frequency: values.frequency,
        runType: values.runType,
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        paymentDate: values.paymentDate,
        rulePackId: values.rulePackId === "__none__" ? undefined : values.rulePackId,
        currency: values.currency.trim().toUpperCase(),
        sequence: values.sequence,
        formulaInputs,
      }, crypto.randomUUID())
      toast.success("Salary process created successfully.")
      setOpen(false)
      setValues(DEFAULT_VALUES)
      setScopeOptions(null)
      triggerRefresh()
    } catch (caught) { setError(handleError(caught, "Unable to create the salary process.", false)) } finally { setSubmitting(false) }
  }

  const runAction = async () => {
    if (!target) return
    setSubmitting(true)
    setActionError("")
    try {
      if (action === "paid") await markPayrollPaid(context(), target.id, actionValues.paidStatus)
      else await transitionPayroll(context(), target.id, action, { rowVersion: target.rowVersion ?? 1, comment: actionValues.comment.trim() || undefined }, action === "calculate" || action === "reverse" ? crypto.randomUUID() : undefined)
      toast.success(action === "calculate" ? "Salary calculation queued." : `Payroll ${action.replaceAll("-", " ")} completed.`)
      setTarget(null)
      triggerRefresh()
    } catch (caught) { setActionError(handleError(caught, "Unable to transition the salary process.", false)) } finally { setSubmitting(false) }
  }

  const showDetails = useCallback(async (record: PayrollRunRecord) => {
    setDetailRun(record)
    setDetailEmployees([])
    setDetailError("")
    setDetailLoading(true)
    try {
      const [run, details] = await Promise.all([getPayrollRun(context(), record.id), getPayrollDetails(context(), record.id)])
      setDetailRun(run)
      setDetailEmployees(details.items)
    } catch (caught) { setDetailError(handleError(caught, "Unable to load salary details.", false)) } finally { setDetailLoading(false) }
  }, [context, handleError])

  const active = useMemo(() => records.filter((item) => item.status !== "REVERSED"), [records])
  const reversed = useMemo(() => records.filter((item) => item.status === "REVERSED"), [records])

  return (
    <HrWorkspaceLayout>
      <HrPageHeader title="Salary Processing" description="Process one employee or a bulk department, section, or designation with leave, overtime, loans, statutory deductions, and custom salary formulas." badges={[{ label: `${meta?.total ?? records.length} total`, variant: "secondary" }, { label: `${records.filter((item) => item.status === "CALCULATING").length} calculating` }, { label: `${records.filter((item) => item.status === "LOCKED").length} locked on page` }]} onRefresh={triggerRefresh} onCreate={() => { setValues(DEFAULT_VALUES); setScopeOptions(null); setError(""); setOpen(true) }} createLabel="New salary process" />
      <ActivePayrollSection data={active} meta={meta} loading={loading} search={search} page={page} limit={limit} onSearchChange={setSearch} onPageChange={setPage} onLimitChange={setLimit} onAction={(record, nextAction) => { setTarget(record); setAction(nextAction); setActionValues({ comment: "", paidStatus: record.paidStatus || "PAID" }); setActionError("") }} onView={(record) => void showDetails(record)} />
      <DeletedPayrollSection data={reversed} />
      <PayrollFormDialog open={open} values={values} factories={factories} payGroups={payGroups} rulePacks={rulePacks} scopeOptions={scopeOptions} scopeLoading={scopeLoading} submitting={submitting} error={error} onOpenChange={setOpen} onChange={changeValue} onSubmit={submit} />
      <PayrollActionDialog open={Boolean(target)} action={action} values={actionValues} submitting={submitting} error={actionError} onOpenChange={(next) => { if (!next) setTarget(null) }} onChange={(name, value) => setActionValues((current) => ({ ...current, [name]: value }))} onSubmit={runAction} />
      <PayrollDetailsDialog open={Boolean(detailRun)} run={detailRun} employees={detailEmployees} loading={detailLoading} error={detailError} onOpenChange={(next) => { if (!next) setDetailRun(null) }} />
    </HrWorkspaceLayout>
  )
}
