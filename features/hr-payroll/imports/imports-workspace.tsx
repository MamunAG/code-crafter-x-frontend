"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ActiveImportsSection } from "./component/active-imports-section"
import { DeletedImportsSection } from "./component/deleted-imports-section"
import { ImportFormDialog, type ImportFormValues } from "./component/import-form-dialog"
import { getJob, queueImport } from "../operations/operations.service"
import type { HrJobRecord } from "../operations/operations.types"
import { HrPageHeader } from "../shared/hr-page-header"
import { HrWorkspaceLayout } from "../shared/hr-workspace-layout"
import { useHrWorkspace } from "../shared/use-hr-workspace"

const DEFAULT_VALUES: ImportFormValues = { type: "employee-details", file: null }
export function ImportsWorkspace({ apiUrl }: { apiUrl: string }) {
  const { context, handleError } = useHrWorkspace(apiUrl); const [jobs, setJobs] = useState<HrJobRecord[]>([]); const [open, setOpen] = useState(false); const [values, setValues] = useState<ImportFormValues>(DEFAULT_VALUES); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState("")
  const submit = async () => { if (!(values.file instanceof File)) { setError("Select an Excel file to import."); return } setSubmitting(true); setError(""); try { const job = await queueImport(context(), values.type, values.file); setJobs((current) => [job, ...current]); toast.success("HR import queued successfully."); setOpen(false); setValues(DEFAULT_VALUES) } catch (caught) { setError(handleError(caught, "Unable to queue the HR import.", false)) } finally { setSubmitting(false) } }
  const refreshJob = async (job: HrJobRecord) => { try { const latest = await getJob(context(), job.id, true); setJobs((current) => current.map((item) => item.id === latest.id ? latest : item)); toast.success(`Import job is ${latest.status.toLowerCase()}.`) } catch (caught) { handleError(caught, "Unable to refresh the import job.") } }
  const active = useMemo(() => jobs.filter((item) => item.status !== "FAILED"), [jobs]); const failed = useMemo(() => jobs.filter((item) => item.status === "FAILED"), [jobs])
  return <HrWorkspaceLayout><HrPageHeader title="HR Imports" description="Queue validated Excel imports for employee details, balances, loans, salary assignments, and payroll openings." badges={[{ label: `${jobs.length} jobs this session`, variant: "secondary" }, { label: `${jobs.filter((item) => item.status === "COMPLETED").length} completed` }, { label: `${failed.length} failed` }]} onCreate={() => { setValues(DEFAULT_VALUES); setError(""); setOpen(true) }} createLabel="New import" /><ActiveImportsSection data={active} onRefreshJob={refreshJob} /><DeletedImportsSection data={failed} /><ImportFormDialog open={open} values={values} submitting={submitting} error={error} onOpenChange={setOpen} onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))} onSubmit={submit} /></HrWorkspaceLayout>
}

