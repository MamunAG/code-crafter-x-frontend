"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarDays, CheckCircle2, Clock3, FileText, LayoutDashboard, Loader2, MoreHorizontal, Plus, Scale, Settings2, ShieldCheck, Users } from "lucide-react"
import { toast } from "sonner"
import { AppSelect } from "@/components/app-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LeaveActionDialog, type LeaveActionValues } from "./component/leave-action-dialog"
import { LeaveDetailsDialog } from "./component/leave-details-dialog"
import { LeaveFormDialog, type LeaveFormValues } from "./component/leave-form-dialog"
import { adjustLeaveBalance, cancelLeave, createLeave, decideLeave, getLeaveBalances, getLeaveDashboard, getLeaveDetails, getLeaveLedger, listApprovalInbox, listLeave, listMyLeave, loadLookupOptions, previewLeave, resubmitLeave } from "../operations/operations.service"
import type { LeaveBalanceRecord, LeaveDashboard, LeaveLedgerRecord, LeavePreview, LeaveRequestRecord, LookupRecord } from "../operations/operations.types"
import { HrPageHeader } from "../shared/hr-page-header"
import { HrRecordsSection, type HrDisplayColumn } from "../shared/hr-records-section"
import type { HrOption, HrPaginationMeta } from "../shared/hr.types"
import { HrWorkspaceLayout } from "../shared/hr-workspace-layout"
import { useHrWorkspace } from "../shared/use-hr-workspace"
import { isGlobalAdmin, parseStoredAuthUser } from "@/lib/auth-session"

type View = "dashboard" | "applications" | "balance" | "approvals" | "calendar" | "administration" | "configuration"
const VIEWS: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard }, { id: "applications", label: "My applications", icon: FileText }, { id: "balance", label: "My balance", icon: Scale }, { id: "approvals", label: "Approval inbox", icon: ShieldCheck }, { id: "calendar", label: "Team calendar", icon: CalendarDays }, { id: "administration", label: "Administration", icon: Users }, { id: "configuration", label: "Configuration", icon: Settings2 },
]
const EMPTY_FORM: LeaveFormValues = { employeeId: "", leaveTypeId: "", startDate: "", endDate: "", durationType: "FULL_DAY", reason: "", contactDuringLeave: "", attachmentUrl: "" }
const EMPTY_ACTION: LeaveActionValues = { decision: "APPROVED", comment: "" }
const statusVariant = (status: string) => status === "APPROVED" ? "secondary" as const : status === "REJECTED" ? "destructive" as const : "outline" as const
const formatQuantity = (value: string | number | undefined) => Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })

export function LeaveWorkspace({ apiUrl }: { apiUrl: string }) {
  const searchParams = useSearchParams()
  const { organizationId, context, handleError, refreshVersion, triggerRefresh } = useHrWorkspace(apiUrl)
  const [view, setView] = useState<View>("dashboard")
  const [isAdmin, setIsAdmin] = useState(false)
  const [employees, setEmployees] = useState<HrOption[]>([])
  const [leaveTypes, setLeaveTypes] = useState<HrOption[]>([])
  const [leaveTypeRecords, setLeaveTypeRecords] = useState<LookupRecord[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [records, setRecords] = useState<LeaveRequestRecord[]>([])
  const [meta, setMeta] = useState<HrPaginationMeta | null>(null)
  const [dashboard, setDashboard] = useState<LeaveDashboard | null>(null)
  const [balances, setBalances] = useState<LeaveBalanceRecord[]>([])
  const [ledger, setLedger] = useState<LeaveLedgerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<LeaveFormValues>(EMPTY_FORM)
  const [preview, setPreview] = useState<LeavePreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [details, setDetails] = useState<LeaveRequestRecord | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [actionMode, setActionMode] = useState<"decision" | "cancel" | null>(null)
  const [target, setTarget] = useState<LeaveRequestRecord | null>(null)
  const [action, setAction] = useState<LeaveActionValues>(EMPTY_ACTION)
  const [actionError, setActionError] = useState("")
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustment, setAdjustment] = useState({ employeeId: "", leaveTypeId: "", amount: "", effectiveDate: new Date().toISOString().slice(0, 10), reason: "", reference: "" })

  const label = useCallback((options: HrOption[], id: string) => options.find((item) => item.value === id)?.label ?? id, [])
  const filters = useMemo(() => ({ search, status: status || undefined, leaveTypeId: typeFilter || undefined }), [search, status, typeFilter])
  useEffect(() => { const requested = searchParams.get("view") as View | null; if (!requested || !VIEWS.some((item) => item.id === requested)) return; const pending = window.setTimeout(() => setView(requested), 0); return () => window.clearTimeout(pending) }, [searchParams])
  useEffect(() => { if (searchParams.get("apply") !== "1") return; const pending = window.setTimeout(() => setFormOpen(true), 0); return () => window.clearTimeout(pending) }, [searchParams])
  useEffect(() => { const refresh = () => triggerRefresh(); window.addEventListener("leave-notification", refresh); return () => window.removeEventListener("leave-notification", refresh) }, [triggerRefresh])

  useEffect(() => { const pending = window.setTimeout(() => { setPage(1); setRecords([]) }, 0); return () => window.clearTimeout(pending) }, [view, organizationId])
  useEffect(() => {
    if (!organizationId) return
    void loadLookupOptions(context(), ["employees", "leaveTypes"]).then((lookups) => {
      setLeaveTypeRecords(lookups.leaveTypes)
      const user = parseStoredAuthUser(window.localStorage.getItem("auth_user")); const admin = isGlobalAdmin(user); setIsAdmin(admin)
      const visibleEmployees = admin ? lookups.employees : lookups.employees.filter((item) => item.email?.toLowerCase() === user?.email?.toLowerCase())
      setEmployees(visibleEmployees.map((item) => ({ value: item.id, label: `${item.employeeCode ?? ""} · ${item.employeeName ?? item.id}` })))
      if (!admin && visibleEmployees[0]) setSelectedEmployee(visibleEmployees[0].id)
      setLeaveTypes(lookups.leaveTypes.map((item) => ({ value: item.id, label: `${item.code ?? ""} · ${item.name ?? item.id}` })))
    }).catch((error) => handleError(error, "Unable to load leave options."))
  }, [context, handleError, organizationId, refreshVersion])

  const load = useCallback(async () => {
    if (!organizationId) { setLoading(false); return }
    setLoading(true)
    try {
      if (view === "dashboard") setDashboard(await getLeaveDashboard(context()))
      else if (view === "applications") { const result = await listMyLeave(context(), page, limit, filters); setRecords(result.items); setMeta(result.meta) }
      else if (view === "approvals") { const result = await listApprovalInbox(context(), page, limit, filters); setRecords(result.items); setMeta(result.meta) }
      else if (["administration", "calendar"].includes(view)) { const result = await listLeave(context(), page, view === "calendar" ? 50 : limit, search, filters); setRecords(view === "calendar" ? result.items.filter((item) => ["APPROVED", "PENDING"].includes(item.status)) : result.items); setMeta(result.meta) }
      else if (view === "balance" && selectedEmployee) { const [balanceRows, ledgerRows] = await Promise.all([getLeaveBalances(context(), selectedEmployee), getLeaveLedger(context(), selectedEmployee, page, limit)]); setBalances(balanceRows); setLedger(ledgerRows.items); setMeta(ledgerRows.meta) }
    } catch (error) { handleError(error, "Unable to load leave management data.") } finally { setLoading(false) }
  }, [context, filters, handleError, limit, organizationId, page, search, selectedEmployee, view])
  useEffect(() => { const pending = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(pending) }, [load, refreshVersion])

  useEffect(() => {
    if (!formOpen || !form.employeeId || !form.leaveTypeId || !form.startDate || !form.endDate) { const empty = window.setTimeout(() => setPreview(null), 0); return () => window.clearTimeout(empty) }
    const pending = window.setTimeout(async () => { setPreviewing(true); setFormError(""); try { setPreview(await previewLeave(context(), { ...form, isHalfDay: ["FIRST_HALF", "SECOND_HALF"].includes(form.durationType), contactDuringLeave: form.contactDuringLeave || undefined, attachmentUrl: form.attachmentUrl || undefined })) } catch (error) { setPreview(null); setFormError(handleError(error, "Unable to calculate leave.", false)) } finally { setPreviewing(false) } }, 350)
    return () => window.clearTimeout(pending)
  }, [context, form, formOpen, handleError])

  const durationOptions = useMemo(() => {
    const settings = leaveTypeRecords.find((item) => item.id === form.leaveTypeId)?.settings ?? preview?.policy ?? {}
    const options: HrOption[] = [{ value: "FULL_DAY", label: "Full day" }]
    if (settings.halfDayAllowed !== false) options.push({ value: "FIRST_HALF", label: "First half" }, { value: "SECOND_HALF", label: "Second half" })
    if (settings.dayUnit === "HOUR" || settings.hourlyAllowed) options.push({ value: "HOURLY", label: "Hourly" })
    return options
  }, [form.leaveTypeId, leaveTypeRecords, preview])

  async function submitLeave() {
    if (!preview) return
    setSubmitting(true); setFormError("")
    try { await createLeave(context(), { ...form, isHalfDay: ["FIRST_HALF", "SECOND_HALF"].includes(form.durationType), contactDuringLeave: form.contactDuringLeave || undefined, attachmentUrl: form.attachmentUrl || undefined }); toast.success("Leave application submitted."); setFormOpen(false); setForm(EMPTY_FORM); setView("applications"); triggerRefresh() }
    catch (error) { setFormError(handleError(error, "Unable to submit leave.", false)) } finally { setSubmitting(false) }
  }
  async function openDetails(record: LeaveRequestRecord) { setDetailsOpen(true); setDetailsLoading(true); try { setDetails(await getLeaveDetails(context(), record.id)) } catch (error) { handleError(error, "Unable to load leave details.") } finally { setDetailsLoading(false) } }
  function openAction(record: LeaveRequestRecord, mode: "decision" | "cancel") { setTarget(record); setActionMode(mode); setAction(EMPTY_ACTION); setActionError("") }
  async function performAction() {
    if (!target || !actionMode) return
    if (actionMode === "decision" && ["REJECTED", "RETURNED"].includes(action.decision) && !action.comment.trim()) { setActionError("A reason is required for rejection or return."); return }
    setSubmitting(true); setActionError("")
    try { if (actionMode === "decision") await decideLeave(context(), target.id, { decision: action.decision, comment: action.comment.trim() || undefined, rowVersion: target.rowVersion ?? 1 }); else await cancelLeave(context(), target.id, { comment: action.comment.trim() || undefined, rowVersion: target.rowVersion ?? 1 }); toast.success(actionMode === "decision" ? "Leave decision recorded." : "Leave request cancelled."); setActionMode(null); triggerRefresh() }
    catch (error) { setActionError(handleError(error, "Unable to update leave.", false)) } finally { setSubmitting(false) }
  }
  async function resubmit(record: LeaveRequestRecord) { try { await resubmitLeave(context(), record.id); toast.success("Leave application resubmitted."); triggerRefresh() } catch (error) { handleError(error, "Unable to resubmit leave.") } }
  async function submitAdjustment() {
    const amount = Number(adjustment.amount)
    if (!adjustment.employeeId || !adjustment.leaveTypeId || !Number.isFinite(amount) || amount === 0 || !adjustment.reason.trim()) { toast.error("Employee, leave type, non-zero amount, and reason are required."); return }
    setSubmitting(true); try { const result = await adjustLeaveBalance(context(), { ...adjustment, amount }); toast.success(`Balance adjusted from ${formatQuantity(result.previousBalance)} to ${formatQuantity(result.available)}.`); setAdjustOpen(false); setSelectedEmployee(adjustment.employeeId); setView("balance"); triggerRefresh() } catch (error) { handleError(error, "Unable to adjust leave balance.") } finally { setSubmitting(false) }
  }

  const columns: HrDisplayColumn<LeaveRequestRecord>[] = [
    { id: "application", header: "Application #", render: (item) => <button className="font-medium underline-offset-4 hover:underline" onClick={() => void openDetails(item)}>{item.applicationNumber ?? item.id.slice(0, 8)}</button> },
    { id: "employee", header: "Employee", render: (item) => label(employees, item.employeeId) },
    { id: "type", header: "Leave type", render: (item) => label(leaveTypes, item.leaveTypeId) },
    { id: "period", header: "Dates", render: (item) => <div><p>{item.startDate} – {item.endDate}</p><p className="text-muted-foreground">{formatQuantity(item.days)} day(s) · {(item.durationType ?? "FULL_DAY").replaceAll("_", " ")}</p></div> },
    { id: "status", header: "Status", render: (item) => <div><Badge variant={statusVariant(item.status)}>{item.status.replaceAll("_", " ")}</Badge><p className="mt-1 text-muted-foreground">Level {item.approvalLevel}/{item.requiredApprovalLevels}</p></div> },
    { id: "applied", header: "Applied", render: (item) => item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—" },
    { id: "actions", header: "Actions", render: (item) => <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label={`Actions for ${item.applicationNumber ?? item.id}`}><MoreHorizontal/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => void openDetails(item)}>View details</DropdownMenuItem>{view === "approvals" && item.status === "PENDING" ? <DropdownMenuItem onSelect={() => openAction(item, "decision")}>Approve, reject, or return</DropdownMenuItem> : null}{view === "applications" && item.status === "RETURNED" ? <DropdownMenuItem onSelect={() => void resubmit(item)}>Resubmit</DropdownMenuItem> : null}{view === "applications" && ["PENDING", "APPROVED"].includes(item.status) ? <><DropdownMenuSeparator/><DropdownMenuItem variant="destructive" onSelect={() => openAction(item, "cancel")}>{item.status === "APPROVED" ? "Request cancellation" : "Cancel request"}</DropdownMenuItem></> : null}</DropdownMenuContent></DropdownMenu> },
  ]

  return <HrWorkspaceLayout>
    <HrPageHeader title="Leave Management" description="Apply, track balances, manage approvals, and administer leave from one permission-aware workspace." badges={[{ label: `${dashboard?.balances.length ?? leaveTypes.length} leave types`, variant: "secondary" }, { label: `${dashboard?.returned.length ?? 0} awaiting action` }]} onRefresh={triggerRefresh} onCreate={() => { setForm({ ...EMPTY_FORM, employeeId: selectedEmployee }); setFormError(""); setFormOpen(true) }} createLabel="Apply leave" />
    <nav aria-label="Leave management sections" className="flex gap-2 overflow-x-auto rounded-xl border bg-card p-2">{VIEWS.map((item) => <Button key={item.id} variant={view === item.id ? "default" : "ghost"} size="sm" className="shrink-0" onClick={() => setView(item.id)}><item.icon/>{item.label}</Button>)}</nav>
    {!organizationId ? <Card><CardContent className="py-12 text-center text-muted-foreground">Select an organization to use Leave Management.</CardContent></Card> : null}
    {organizationId && view === "dashboard" ? <Dashboard dashboard={dashboard} loading={loading} onApply={() => setFormOpen(true)} onViewApplications={() => setView("applications")} /> : null}
    {organizationId && ["applications", "approvals", "administration"].includes(view) ? <div className="space-y-4"><FilterBar status={status} type={typeFilter} leaveTypes={leaveTypes} onStatus={setStatus} onType={setTypeFilter} /> <HrRecordsSection title={view === "applications" ? "My applications" : view === "approvals" ? "Pending approvals" : "All leave applications"} description={view === "approvals" && !records.length && !loading ? "You have no pending leave approvals." : undefined} data={records} loading={loading} columns={columns} getRowId={(item) => item.id} search={search} onSearchChange={setSearch} page={page} totalPages={meta?.totalPages ?? 1} pageSize={limit} onPageChange={setPage} onPageSizeChange={(size) => { setLimit(size); setPage(1) }} emptyMessage={view === "applications" ? "You have not submitted any leave applications." : view === "approvals" ? "You have no pending leave approvals." : "No leave applications match these filters."} /></div> : null}
    {organizationId && view === "balance" ? <BalanceView employees={employees} employeeId={selectedEmployee} balances={balances} ledger={ledger} loading={loading} meta={meta} page={page} limit={limit} leaveTypes={leaveTypes} isAdmin={isAdmin} onEmployee={setSelectedEmployee} onPage={setPage} onAdjust={() => { setAdjustment((value) => ({ ...value, employeeId: selectedEmployee })); setAdjustOpen(true) }} /> : null}
    {organizationId && view === "calendar" ? <CalendarView records={records} employees={employees} leaveTypes={leaveTypes} loading={loading} /> : null}
    {organizationId && view === "configuration" ? <ConfigurationView /> : null}
    <LeaveFormDialog open={formOpen} values={form} employees={employees} leaveTypes={leaveTypes} durationOptions={durationOptions} preview={preview} previewing={previewing} submitting={submitting} error={formError} onOpenChange={setFormOpen} onChange={(name, value) => setForm((current) => ({ ...current, [name]: value }))} onSubmit={() => void submitLeave()} />
    <LeaveDetailsDialog open={detailsOpen} loading={detailsLoading} record={details} onOpenChange={setDetailsOpen} />
    <LeaveActionDialog open={Boolean(actionMode)} mode={actionMode ?? "decision"} values={action} submitting={submitting} error={actionError} onOpenChange={(open) => { if (!open) setActionMode(null) }} onChange={(name, value) => setAction((current) => ({ ...current, [name]: value }))} onSubmit={() => void performAction()} />
    <AdjustmentDialog open={adjustOpen} values={adjustment} employees={employees} leaveTypes={leaveTypes} balances={balances} submitting={submitting} onOpenChange={setAdjustOpen} onChange={(name, value) => setAdjustment((current) => ({ ...current, [name]: value }))} onSubmit={() => void submitAdjustment()} />
  </HrWorkspaceLayout>
}

function Dashboard({ dashboard, loading, onApply, onViewApplications }: { dashboard: LeaveDashboard | null; loading: boolean; onApply: () => void; onViewApplications: () => void }) {
  if (loading) return <Card><CardContent className="flex min-h-56 items-center justify-center"><Loader2 className="animate-spin"/></CardContent></Card>
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{dashboard?.balances.map((balance) => <Card key={balance.leaveTypeId}><CardHeader><CardTitle>{balance.leaveTypeName}</CardTitle><CardDescription>Current entitlement</CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">{formatQuantity(balance.available)}</p><div className="mt-3 flex gap-3 text-muted-foreground"><span>Used {formatQuantity(balance.used)}</span><span>Pending {formatQuantity(balance.pending)}</span></div></CardContent></Card>)}{!dashboard?.balances.length ? <Card className="sm:col-span-2"><CardContent className="py-10 text-center text-muted-foreground">No leave balances are available yet.</CardContent></Card> : null}</div>
    <div className="grid gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>Recent applications</CardTitle><CardDescription>Your latest leave activity</CardDescription></CardHeader><CardContent className="space-y-2">{dashboard?.recentApplications.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{item.applicationNumber ?? "Leave application"}</p><p className="text-muted-foreground">{item.startDate} – {item.endDate} · {formatQuantity(item.days)} day(s)</p></div><Badge variant={statusVariant(item.status)}>{item.status}</Badge></div>)}{!dashboard?.recentApplications.length ? <p className="py-8 text-center text-muted-foreground">You have not submitted any leave applications.</p> : null}<Button variant="outline" onClick={onViewApplications}>View all applications</Button></CardContent></Card>
    <Card><CardHeader><CardTitle>Quick actions</CardTitle><CardDescription>Keep leave work moving</CardDescription></CardHeader><CardContent className="space-y-3"><Button className="w-full" onClick={onApply}><Plus/>Apply leave</Button>{dashboard?.returned.length ? <Alert><Clock3/><AlertDescription>{dashboard.returned.length} returned application(s) need your changes.</AlertDescription></Alert> : <Alert><CheckCircle2/><AlertDescription>No applications are awaiting your action.</AlertDescription></Alert>}{dashboard?.upcomingLeave.length ? <p className="text-muted-foreground">Upcoming approved leave: {dashboard.upcomingLeave[0]?.startDate}</p> : null}</CardContent></Card></div>
  </div>
}

function FilterBar({ status, type, leaveTypes, onStatus, onType }: { status: string; type: string; leaveTypes: HrOption[]; onStatus: (value: string) => void; onType: (value: string) => void }) { return <Card><CardContent className="grid gap-3 pt-0 sm:grid-cols-2"><div><Label>Status</Label><AppSelect value={status || "ALL"} onValueChange={(value) => onStatus(value === "ALL" ? "" : value)} options={["ALL", "DRAFT", "PENDING", "APPROVED", "REJECTED", "RETURNED", "CANCELLED", "CANCELLATION_PENDING"].map((value) => ({ value, label: value.replaceAll("_", " ") }))} triggerClassName="mt-1 h-9" /></div><div><Label>Leave type</Label><AppSelect value={type || "ALL"} onValueChange={(value) => onType(value === "ALL" ? "" : value)} options={[{ value: "ALL", label: "All leave types" }, ...leaveTypes]} triggerClassName="mt-1 h-9" /></div></CardContent></Card> }

function BalanceView({ employees, employeeId, balances, ledger, loading, meta, page, limit, leaveTypes, isAdmin, onEmployee, onPage, onAdjust }: { employees: HrOption[]; employeeId: string; balances: LeaveBalanceRecord[]; ledger: LeaveLedgerRecord[]; loading: boolean; meta: HrPaginationMeta | null; page: number; limit: number; leaveTypes: HrOption[]; isAdmin: boolean; onEmployee: (id: string) => void; onPage: (page: number) => void; onAdjust: () => void }) {
  const ledgerColumns: HrDisplayColumn<LeaveLedgerRecord>[] = [{ id: "date", header: "Date", render: (row) => new Date(row.date).toLocaleDateString() }, { id: "type", header: "Leave type", render: (row) => leaveTypes.find((item) => item.value === row.leaveTypeId)?.label ?? row.leaveTypeId }, { id: "transaction", header: "Transaction", render: (row) => row.transactionType }, { id: "reference", header: "Reference", render: (row) => row.reference }, { id: "credit", header: "Credit", render: (row) => formatQuantity(row.credit) }, { id: "debit", header: "Debit", render: (row) => formatQuantity(row.debit) }]
  return <div className="space-y-4"><Card><CardContent className="flex flex-col gap-3 pt-0 sm:flex-row sm:items-end"><div className="flex-1"><Label>{isAdmin ? "Employee" : "My employee profile"}</Label><AppSelect value={employeeId} onValueChange={onEmployee} options={employees} placeholder="Select employee" disabled={!isAdmin} triggerClassName="mt-1 h-9" /></div>{isAdmin ? <Button variant="outline" disabled={!employeeId} onClick={onAdjust}>Adjust balance</Button> : null}</CardContent></Card>{employeeId ? <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{balances.map((balance) => <Card key={balance.id}><CardHeader><CardTitle>{balance.leaveType?.name ?? leaveTypes.find((item) => item.value === balance.leaveTypeId)?.label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{formatQuantity(balance.available)} available</p><div className="mt-3 grid grid-cols-2 gap-1 text-muted-foreground"><span>Opening {formatQuantity(balance.opening)}</span><span>Accrued {formatQuantity(balance.accrued)}</span><span>Adjusted {formatQuantity(balance.adjusted)}</span><span>Carry {formatQuantity(balance.carriedForward)}</span><span>Used {formatQuantity(balance.used)}</span><span>Expired {formatQuantity(balance.expired)}</span></div></CardContent></Card>)}</div><HrRecordsSection title="Leave ledger" data={ledger} loading={loading} columns={ledgerColumns} getRowId={(row) => row.id} page={page} totalPages={meta?.totalPages ?? 1} pageSize={limit} onPageChange={onPage} emptyMessage="No leave ledger transactions found." /></> : <Card><CardContent className="py-12 text-center text-muted-foreground">No employee profile linked to your signed-in email. Contact HR to link your profile.</CardContent></Card>}</div>
}

function CalendarView({ records, employees, leaveTypes, loading }: { records: LeaveRequestRecord[]; employees: HrOption[]; leaveTypes: HrOption[]; loading: boolean }) { const [employee, setEmployee] = useState("ALL"); const [leaveType, setLeaveType] = useState("ALL"); const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); const visible = records.filter((item) => (employee === "ALL" || item.employeeId === employee) && (leaveType === "ALL" || item.leaveTypeId === leaveType) && (!month || item.startDate.slice(0, 7) <= month && item.endDate.slice(0, 7) >= month)); return <Card><CardHeader><CardTitle>Team leave calendar</CardTitle><CardDescription>Approved leave and pending requests are visually distinct. Results remain limited by backend permissions.</CardDescription></CardHeader><CardContent><div className="mb-4 grid gap-3 sm:grid-cols-3"><div><Label>Month</Label><Input type="month" className="mt-1 h-9" value={month} onChange={(event) => setMonth(event.target.value)} /></div><div><Label>Employee</Label><AppSelect value={employee} onValueChange={setEmployee} options={[{ value: "ALL", label: "All employees" }, ...employees]} triggerClassName="mt-1 h-9" /></div><div><Label>Leave type</Label><AppSelect value={leaveType} onValueChange={setLeaveType} options={[{ value: "ALL", label: "All leave types" }, ...leaveTypes]} triggerClassName="mt-1 h-9" /></div></div>{loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin"/></div> : visible.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <div key={item.id} className="rounded-xl border p-4"><div className="flex justify-between gap-2"><p className="font-medium">{employees.find((option) => option.value === item.employeeId)?.label ?? item.employeeId}</p><Badge variant={item.status === "APPROVED" ? "secondary" : "outline"}>{item.status}</Badge></div><p className="mt-2">{item.startDate} – {item.endDate}</p><p className="text-muted-foreground">{leaveTypes.find((type) => type.value === item.leaveTypeId)?.label} · {formatQuantity(item.days)} day(s)</p></div>)}</div> : <p className="py-12 text-center text-muted-foreground">No team leave is scheduled in this period.</p>}</CardContent></Card> }

function ConfigurationView() { const cards = [{ title: "Leave types", description: "Entitlement, half-day, carry forward, documentation, and active status.", href: "/hr-payroll/leave/leave-type" }, { title: "Holiday calendar", description: "Business holidays and weekly rest-day calendars.", href: "/hr-payroll/core/holiday-calendar" }, { title: "Leave policies", description: "Effective-dated policies and rules by leave type.", href: "/hr-payroll/leave/policies" }, { title: "Policy assignments", description: "Assign policies to employees with effective dates.", href: "/hr-payroll/leave/policy-assignments" }, { title: "Approval workflows", description: "Configure ordered approval levels and approver types.", href: "/hr-payroll/leave/workflows" }, { title: "Workflow assignments", description: "Resolve workflows from company through employee priority.", href: "/hr-payroll/leave/workflow-assignments" }]; return <div><Alert className="mb-4"><Settings2/><AlertDescription>Workflow resolution priority: Employee &gt; Designation &gt; Section &gt; Department &gt; Factory &gt; Company.</AlertDescription></Alert><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map((card) => <Card key={card.title}><CardHeader><CardTitle>{card.title}</CardTitle><CardDescription>{card.description}</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href={card.href}>Open configuration</Link></Button></CardContent></Card>)}</div></div> }

function AdjustmentDialog({ open, values, employees, leaveTypes, balances, submitting, onOpenChange, onChange, onSubmit }: { open: boolean; values: { employeeId: string; leaveTypeId: string; amount: string; effectiveDate: string; reason: string; reference: string }; employees: HrOption[]; leaveTypes: HrOption[]; balances: LeaveBalanceRecord[]; submitting: boolean; onOpenChange: (open: boolean) => void; onChange: (name: string, value: string) => void; onSubmit: () => void }) { const current = balances.find((item) => item.employeeId === values.employeeId && item.leaveTypeId === values.leaveTypeId)?.available ?? 0; const next = current + (Number(values.amount) || 0); return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Adjust leave balance</DialogTitle><DialogDescription>The backend validates and records the authoritative adjustment.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><div><Label>Employee</Label><AppSelect value={values.employeeId} onValueChange={(value) => onChange("employeeId", value)} options={employees} triggerClassName="mt-1 h-9" /></div><div><Label>Leave type</Label><AppSelect value={values.leaveTypeId} onValueChange={(value) => onChange("leaveTypeId", value)} options={leaveTypes} triggerClassName="mt-1 h-9" /></div><div><Label>Adjustment</Label><Input type="number" step="0.5" value={values.amount} onChange={(event) => onChange("amount", event.target.value)} placeholder="+2 or -1.5" /></div><div><Label>Effective date</Label><Input type="date" value={values.effectiveDate} onChange={(event) => onChange("effectiveDate", event.target.value)} /></div><div className="sm:col-span-2"><Label>Reason</Label><Textarea value={values.reason} onChange={(event) => onChange("reason", event.target.value)} /></div><div className="sm:col-span-2"><Label>Reference</Label><Input value={values.reference} onChange={(event) => onChange("reference", event.target.value)} /></div></div><Alert><AlertDescription>Current balance: {formatQuantity(current)} · Adjustment: {Number(values.amount) > 0 ? "+" : ""}{formatQuantity(values.amount)} · New balance: {formatQuantity(next)}</AlertDescription></Alert><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={submitting} onClick={onSubmit}>{submitting ? <Loader2 className="animate-spin"/> : null}Confirm adjustment</Button></DialogFooter></DialogContent></Dialog> }
