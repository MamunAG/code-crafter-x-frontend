"use client"

import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import { MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ActiveAttendanceSection, type AttendanceActivity } from "./component/active-attendance-section"
import { AttendanceFormDialog, type AttendanceFormValues, type AttendanceMode } from "./component/attendance-form-dialog"
import { AttendancePullIntegrationsSection, type AttendancePullIntegrationsSectionHandle } from "./component/attendance-pull-integrations-section"
import { DeletedAttendanceSection, type RevokedCredential } from "./component/deleted-attendance-section"
import { attendanceAction, loadLookupOptions } from "../operations/operations.service"
import { HrPageHeader } from "../shared/hr-page-header"
import type { HrOption } from "../shared/hr.types"
import { HrWorkspaceLayout } from "../shared/hr-workspace-layout"
import { useHrWorkspace } from "../shared/use-hr-workspace"

function defaults(mode: AttendanceMode): AttendanceFormValues { return { employeeId: mode === "derive" ? "__all__" : "", dateFrom: "", dateTo: "", finalize: false, externalEventId: `manual-${Date.now()}`, punchedAt: "", direction: "UNKNOWN", deviceIdentifier: "", source: "", allowedIps: "", recordId: "", requestedValues: "{}", reason: "", workDate: "", requestedMinutes: 60, decision: "APPROVED", rowVersion: 1, comment: "", approvedMinutes: "" } }
const LABELS: Record<AttendanceMode, string> = { derive: "Derive attendance", punch: "Manual punch", credential: "New integration credential", revoke: "Revoke credential", correction: "Request correction", "correction-decision": "Decide correction", overtime: "Request overtime", "overtime-decision": "Decide overtime" }
export function AttendanceWorkspace({ apiUrl }: { apiUrl: string }) {
  const { organizationId, context, handleError } = useHrWorkspace(apiUrl)
  const attendancePullIntegrationsRef = useRef<AttendancePullIntegrationsSectionHandle>(null)
  const [employees, setEmployees] = useState<HrOption[]>([]); const [activities, setActivities] = useState<AttendanceActivity[]>([]); const [revoked, setRevoked] = useState<RevokedCredential[]>([])
  const [mode, setMode] = useState<AttendanceMode>("derive"); const [open, setOpen] = useState(false); const [values, setValues] = useState<AttendanceFormValues>(() => defaults("derive")); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState("")
  const load = useCallback(async () => { if (!organizationId) return; try { const result = await loadLookupOptions(context(), ["employees"]); setEmployees(result.employees.map((item) => ({ value: item.id, label: `${item.employeeCode ?? ""} · ${item.employeeName ?? item.id}` }))) } catch (caught) { handleError(caught, "Unable to load employees.") } }, [context, handleError, organizationId])
  useEffect(() => { const pending = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(pending) }, [load])
  const openMode = (nextMode: AttendanceMode) => { setMode(nextMode); setValues(defaults(nextMode)); setError(""); setOpen(true) }
  const submit = async () => { setSubmitting(true); setError(""); try { const recordId = String(values.recordId ?? ""); let path = ""; let payload: Record<string, unknown> = {}; switch (mode) {
    case "derive": path = "derive"; payload = { dateFrom: values.dateFrom, dateTo: values.dateTo, employeeId: values.employeeId === "__all__" ? undefined : values.employeeId, finalize: values.finalize }; break
    case "punch": path = "punches/manual"; payload = { punches: [{ employeeId: values.employeeId, externalEventId: values.externalEventId, punchedAt: new Date(String(values.punchedAt)).toISOString(), direction: values.direction, deviceIdentifier: values.deviceIdentifier || undefined }] }; break
    case "credential": path = "integration-credentials"; payload = { source: values.source, allowedIps: String(values.allowedIps ?? "").split(",").map((item) => item.trim()).filter(Boolean) }; break
    case "revoke": path = `integration-credentials/${recordId}/revoke`; break
    case "correction": path = "corrections"; payload = { attendanceDayId: recordId, requestedValues: JSON.parse(String(values.requestedValues)), reason: values.reason }; break
    case "correction-decision": path = `corrections/${recordId}/decision`; payload = { decision: values.decision, rowVersion: Number(values.rowVersion), comment: values.comment || undefined }; break
    case "overtime": path = "overtime"; payload = { employeeId: values.employeeId, workDate: values.workDate, requestedMinutes: Number(values.requestedMinutes), reason: values.reason || undefined }; break
    case "overtime-decision": path = `overtime/${recordId}/decision`; payload = { decision: values.decision, rowVersion: Number(values.rowVersion), comment: values.comment || undefined, approvedMinutes: values.approvedMinutes === "" ? undefined : Number(values.approvedMinutes) }; break
  } const result = await attendanceAction(context(), path, payload); if (mode === "revoke") setRevoked((current) => [{ id: recordId, createdAt: new Date().toISOString() }, ...current]); setActivities((current) => [{ id: crypto.randomUUID(), operation: LABELS[mode], summary: mode === "credential" && typeof result.secret === "string" ? `Credential created. Copy secret now: ${result.secret}` : "Operation completed successfully", result, createdAt: new Date().toISOString() }, ...current]); toast.success(`${LABELS[mode]} completed successfully.`); setOpen(false) } catch (caught) { const message = caught instanceof SyntaxError ? "Requested values must be valid JSON." : handleError(caught, "Unable to complete the attendance action.", false); setError(message) } finally { setSubmitting(false) } }
  const actions = <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="rounded-xl"><MoreHorizontal />More actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56">{(Object.keys(LABELS) as AttendanceMode[]).filter((item) => item !== "derive").map((item, index) => <Fragment key={item}>{index === 2 || index === 4 ? <DropdownMenuSeparator /> : null}<DropdownMenuItem onSelect={() => openMode(item)}>{LABELS[item]}</DropdownMenuItem></Fragment>)}<DropdownMenuSeparator /><DropdownMenuItem onSelect={() => attendancePullIntegrationsRef.current?.create()}>Add attendance API</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
  return <HrWorkspaceLayout><HrPageHeader title="Attendance Management" description="Ingest punches, derive attendance, manage integrations, and process correction and overtime workflows." badges={[{ label: `${activities.length} actions this session`, variant: "secondary" }, { label: `${revoked.length} credentials revoked` }]} onCreate={() => openMode("derive")} createLabel="Derive attendance" actions={actions} /><AttendancePullIntegrationsSection ref={attendancePullIntegrationsRef} context={context} organizationId={organizationId} handleError={handleError} /><ActiveAttendanceSection data={activities} /><DeletedAttendanceSection data={revoked} /><AttendanceFormDialog open={open} mode={mode} values={values} employees={employees} submitting={submitting} error={error} onOpenChange={setOpen} onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))} onSubmit={submit} /></HrWorkspaceLayout>
}
