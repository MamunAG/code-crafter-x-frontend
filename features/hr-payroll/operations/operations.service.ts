import { hrDownload, hrRequest, type HrRequestContext } from "../shared/hr-api"
import type { HrPaginatedResponse } from "../shared/hr.types"
import type {
  AttendanceResult, HrJobRecord, LeaveBalanceRecord, LeaveDashboard, LeaveLedgerRecord, LeavePreview, LeaveRequestRecord, LoanRecord, LookupRecord, PayrollRunRecord,
  ReportResult, RosterRecord, SalaryAssignmentRecord, SalaryStructureRecord, ShiftRecord, StatutoryRuleRecord,
} from "./operations.types"

export function listShifts(context: HrRequestContext) {
  return hrRequest<ShiftRecord[]>(context, "/api/v1/hr/shifts")
}

export function createShift(context: HrRequestContext, payload: Record<string, unknown>) {
  return hrRequest<ShiftRecord>(context, "/api/v1/hr/shifts", { method: "POST", body: JSON.stringify(payload) })
}

export function createRoster(context: HrRequestContext, payload: Record<string, unknown>) {
  return hrRequest<RosterRecord>(context, "/api/v1/hr/rosters", { method: "POST", body: JSON.stringify(payload) })
}

export function attendanceAction(context: HrRequestContext, path: string, payload: Record<string, unknown>) {
  return hrRequest<AttendanceResult>(context, `/api/v1/hr/attendance/${path}`, { method: "POST", body: JSON.stringify(payload) })
}

export function listLeave(context: HrRequestContext, page: number, limit: number, search = "", filters: Record<string, string | number | boolean | undefined> = {}) {
  return hrRequest<HrPaginatedResponse<LeaveRequestRecord>>(context, "/api/v1/hr/leave", { query: { page, limit, search, ...filters } })
}

export function listMyLeave(context: HrRequestContext, page: number, limit: number, filters: Record<string, string | number | boolean | undefined> = {}) {
  return hrRequest<HrPaginatedResponse<LeaveRequestRecord>>(context, "/api/v1/hr/leave/my-applications", { query: { page, limit, ...filters } })
}

export function listApprovalInbox(context: HrRequestContext, page: number, limit: number, filters: Record<string, string | number | boolean | undefined> = {}) {
  return hrRequest<HrPaginatedResponse<LeaveRequestRecord>>(context, "/api/v1/hr/leave/approval-inbox", { query: { page, limit, ...filters } })
}

export function getLeaveDashboard(context: HrRequestContext) {
  return hrRequest<LeaveDashboard>(context, "/api/v1/hr/leave/dashboard")
}

export function previewLeave(context: HrRequestContext, payload: Record<string, unknown>) {
  return hrRequest<LeavePreview>(context, "/api/v1/hr/leave/preview", { method: "POST", body: JSON.stringify(payload) })
}

export function getLeaveDetails(context: HrRequestContext, id: string) {
  return hrRequest<LeaveRequestRecord>(context, `/api/v1/hr/leave/${id}`)
}

export function getLeaveBalances(context: HrRequestContext, employeeId: string, year?: number) {
  return hrRequest<LeaveBalanceRecord[]>(context, `/api/v1/hr/leave/balances/${employeeId}`, { query: { year } })
}

export function getLeaveLedger(context: HrRequestContext, employeeId: string, page: number, limit: number) {
  return hrRequest<HrPaginatedResponse<LeaveLedgerRecord>>(context, `/api/v1/hr/leave/ledger/${employeeId}`, { query: { page, limit } })
}

export function adjustLeaveBalance(context: HrRequestContext, payload: Record<string, unknown>) {
  return hrRequest<LeaveBalanceRecord & { previousBalance: number; adjustment: number }>(context, "/api/v1/hr/leave/balances/adjust", { method: "POST", body: JSON.stringify(payload) })
}

export function resubmitLeave(context: HrRequestContext, id: string) {
  return hrRequest<LeaveRequestRecord>(context, `/api/v1/hr/leave/${id}/resubmit`, { method: "POST" })
}

export function createLeave(context: HrRequestContext, payload: Record<string, unknown>) {
  return hrRequest<LeaveRequestRecord>(context, "/api/v1/hr/leave", { method: "POST", body: JSON.stringify(payload) })
}

export function decideLeave(context: HrRequestContext, id: string, payload: Record<string, unknown>) {
  return hrRequest<LeaveRequestRecord>(context, `/api/v1/hr/leave/${id}/decision`, { method: "POST", body: JSON.stringify(payload) })
}

export function cancelLeave(context: HrRequestContext, id: string, payload: Record<string, unknown>) {
  return hrRequest<LeaveRequestRecord>(context, `/api/v1/hr/leave/${id}/cancel`, { method: "POST", body: JSON.stringify(payload) })
}

export function listSalaryStructures(context: HrRequestContext) {
  return hrRequest<SalaryStructureRecord[]>(context, "/api/v1/hr/compensation/salary-structures")
}

export function getSalaryStructure(context: HrRequestContext, id: string) {
  return hrRequest<SalaryStructureRecord>(context, `/api/v1/hr/compensation/salary-structures/${id}`)
}

export function createSalaryStructure(context: HrRequestContext, payload: Record<string, unknown>) {
  return hrRequest<SalaryStructureRecord>(context, "/api/v1/hr/compensation/salary-structures", { method: "POST", body: JSON.stringify(payload) })
}

export function activateSalaryStructure(context: HrRequestContext, id: string) {
  return hrRequest<SalaryStructureRecord>(context, `/api/v1/hr/compensation/salary-structures/${id}/activate`, { method: "POST" })
}

export function assignSalary(context: HrRequestContext, payload: Record<string, unknown>) {
  return hrRequest<SalaryAssignmentRecord>(context, "/api/v1/hr/compensation/salary-assignments", { method: "POST", body: JSON.stringify(payload) })
}

export function createLoan(context: HrRequestContext, payload: Record<string, unknown>) {
  return hrRequest<LoanRecord>(context, "/api/v1/hr/loans", { method: "POST", body: JSON.stringify(payload) })
}

export function updateLoanStatus(context: HrRequestContext, id: string, payload: Record<string, unknown>) {
  return hrRequest<LoanRecord>(context, `/api/v1/hr/loans/${id}/status`, { method: "POST", body: JSON.stringify(payload) })
}

export function listStatutoryRules(context: HrRequestContext) {
  return hrRequest<StatutoryRuleRecord[]>(context, "/api/v1/hr/statutory-rules")
}

export function createStatutoryRule(context: HrRequestContext, payload: Record<string, unknown>) {
  return hrRequest<StatutoryRuleRecord>(context, "/api/v1/hr/statutory-rules", { method: "POST", body: JSON.stringify(payload) })
}

export function seedBangladeshRules(context: HrRequestContext) {
  return hrRequest<StatutoryRuleRecord>(context, "/api/v1/hr/statutory-rules/bangladesh/default", { method: "POST" })
}

export function approveStatutoryRule(context: HrRequestContext, id: string) {
  return hrRequest<StatutoryRuleRecord>(context, `/api/v1/hr/statutory-rules/${id}/approve`, { method: "POST" })
}

export function listPayrollRuns(context: HrRequestContext, page: number, limit: number, search = "") {
  return hrRequest<HrPaginatedResponse<PayrollRunRecord>>(context, "/api/v1/hr/payroll-runs", { query: { page, limit, search } })
}

export function getPayrollRun(context: HrRequestContext, id: string) {
  return hrRequest<PayrollRunRecord>(context, `/api/v1/hr/payroll-runs/${id}`)
}

export function createPayrollRun(context: HrRequestContext, payload: Record<string, unknown>, idempotencyKey: string) {
  return hrRequest<PayrollRunRecord>(context, "/api/v1/hr/payroll-runs", { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(payload) })
}

export function transitionPayroll(context: HrRequestContext, id: string, action: string, payload: Record<string, unknown>, idempotencyKey?: string) {
  return hrRequest<PayrollRunRecord | HrJobRecord>(context, `/api/v1/hr/payroll-runs/${id}/${action}`, { method: "POST", headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined, body: JSON.stringify(payload) })
}

export function markPayrollPaid(context: HrRequestContext, id: string, status: string) {
  return hrRequest<PayrollRunRecord>(context, `/api/v1/hr/payroll-runs/${id}/paid-status/${status}`, { method: "POST" })
}

export function getJob(context: HrRequestContext, id: string, importJob = false) {
  return hrRequest<HrJobRecord>(context, importJob ? `/api/v1/hr/imports/jobs/${id}` : `/api/v1/hr/payroll-runs/jobs/${id}/status`)
}

export function getReport(context: HrRequestContext, type: string, query: Record<string, string | number | boolean | undefined>) {
  return hrRequest<ReportResult>(context, `/api/v1/hr/reports/${type}`, { query: { ...query, format: "json" } })
}

export function downloadReport(context: HrRequestContext, type: string, query: Record<string, string | number | boolean | undefined>) {
  return hrDownload(context, `/api/v1/hr/reports/${type}`, query)
}

export function downloadPayslips(context: HrRequestContext, runId: string, language: string) {
  return hrDownload(context, `/api/v1/hr/payslips/run/${runId}`, { language })
}

export function queueImport(context: HrRequestContext, type: string, file: File) {
  const body = new FormData(); body.append("file", file)
  return hrRequest<HrJobRecord>(context, `/api/v1/hr/imports/${type}`, { method: "POST", body })
}

export type HrLookupKey = "employees" | "shifts" | "leaveTypes" | "payGroups" | "factories" | "rulePacks" | "salaryStructures"

export async function loadLookupOptions(context: HrRequestContext, keys: HrLookupKey[]) {
  const requested = new Set(keys)
  const emptyPage = { items: [] as LookupRecord[], meta: { total: 0, page: 1, limit: 100, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }
  const [employees, shifts, leaveTypes, payGroups, factories, rulePacks, salaryStructures] = await Promise.all([
    requested.has("employees") ? hrRequest<HrPaginatedResponse<LookupRecord>>(context, "/api/v1/hr/employee", { query: { page: 1, limit: 100, isActive: true } }) : Promise.resolve(emptyPage),
    requested.has("shifts") ? listShifts(context) : Promise.resolve([]),
    requested.has("leaveTypes") ? hrRequest<HrPaginatedResponse<LookupRecord>>(context, "/api/v1/hr/master-data/leave-types", { query: { page: 1, limit: 100, isActive: true } }) : Promise.resolve(emptyPage),
    requested.has("payGroups") ? hrRequest<HrPaginatedResponse<LookupRecord>>(context, "/api/v1/hr/master-data/pay-groups", { query: { page: 1, limit: 100, isActive: true } }) : Promise.resolve(emptyPage),
    requested.has("factories") ? hrRequest<HrPaginatedResponse<LookupRecord>>(context, "/api/v1/factory", { query: { page: 1, limit: 100, isActive: true } }) : Promise.resolve(emptyPage),
    requested.has("rulePacks") ? listStatutoryRules(context) : Promise.resolve([]),
    requested.has("salaryStructures") ? listSalaryStructures(context) : Promise.resolve([]),
  ])
  return { employees: employees.items, shifts, leaveTypes: leaveTypes.items, payGroups: payGroups.items, factories: factories.items, rulePacks, salaryStructures }
}
