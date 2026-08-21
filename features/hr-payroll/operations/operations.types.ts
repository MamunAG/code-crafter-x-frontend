import type { HrBaseRecord, HrPaginationMeta } from "../shared/hr.types"

export type ShiftRecord = HrBaseRecord & {
  code: string
  name: string
  startTime: string
  endTime: string
  breakMinutes: number
  graceInMinutes: number
  graceOutMinutes: number
  overtimeAfterMinutes: number
  isOvernight: boolean
  isFlexible: boolean
  isActive: boolean
}

export type RosterRecord = HrBaseRecord & {
  employeeId: string
  shiftId: string
  effectiveFrom: string
  effectiveTo?: string | null
  weeklyOffDays: number[]
}

export type AttendanceResult = HrBaseRecord & Record<string, unknown>

export type LeaveRequestRecord = HrBaseRecord & {
  applicationNumber?: string | null
  employeeId: string
  leaveTypeId: string
  startDate: string
  endDate: string
  days: string
  isHalfDay: boolean
  durationType?: string
  reason?: string | null
  contactDuringLeave?: string | null
  attachmentUrl?: string | null
  status: string
  approvalLevel: number
  requiredApprovalLevels: number
  approvalHistory?: Array<Record<string, unknown>>
  dayBreakdown?: LeaveDayBreakdown[]
  employee?: Record<string, unknown> | null
  leaveType?: { id: string; name?: string; code?: string; settings?: Record<string, unknown> } | null
  currentBalance?: number
}

export type LeaveDayBreakdown = { date: string; dayType: string; label?: string | null; duration?: string | null; chargedDays: number }
export type LeavePreview = { currentBalance: number; calendarDays: number; weeklyOffDays: number; holidays: number; chargeableDays: number; balanceAfterApproval: number; dayBreakdown: LeaveDayBreakdown[]; policy: Record<string, unknown> & { leaveTypeName?: string } }
export type LeaveBalanceRecord = HrBaseRecord & { employeeId: string; leaveTypeId: string; periodYear: number; opening: string; accrued: string; adjusted: string; carriedForward: string; used: string; encashed: string; expired: string; available: number; leaveType?: { name?: string; code?: string } }
export type LeaveDashboard = { balances: Array<{ leaveTypeId: string; leaveTypeName: string; color?: unknown; opening: number; accrued: number; adjusted: number; carriedForward: number; used: number; encashed: number; expired: number; available: number; pending: number }>; recentApplications: LeaveRequestRecord[]; upcomingLeave: LeaveRequestRecord[]; returned: LeaveRequestRecord[] }
export type LeaveLedgerRecord = { id: string; date: string; leaveTypeId: string; transactionType: string; reference: string; credit: number; debit: number; description?: string | null }

export type SalaryStructureComponent = {
  id?: string
  code: string
  name: string
  nameBn?: string | null
  type: string
  formula: string
  sortOrder?: number
  isTaxable?: boolean
}

export type SalaryStructureRecord = HrBaseRecord & {
  code: string
  name: string
  version: number
  effectiveFrom: string
  effectiveTo?: string | null
  isActive: boolean
  lockedAt?: string | null
  components?: SalaryStructureComponent[]
}

export type SalaryAssignmentRecord = HrBaseRecord & {
  employeeId: string
  salaryStructureId?: string
  structureId?: string
  effectiveFrom: string
  effectiveTo?: string | null
  baseAmount: string
  currency: string
  componentOverrides?: Record<string, number>
}

export type LoanRecord = HrBaseRecord & {
  employeeId: string
  loanNumber: string
  principal: string
  installmentAmount?: string
  outstandingAmount?: string
  outstanding?: string
  status: string
  startDate?: string
  remarks?: string | null
}

export type StatutoryRuleRecord = HrBaseRecord & {
  code: string
  name: string
  jurisdiction: string
  version: number
  effectiveFrom: string
  effectiveTo?: string | null
  rules: Record<string, unknown>
  sourceUrl: string
  sourcePublishedAt?: string | null
  reviewStatus: string
  approvedAt?: string | null
  lockedAt?: string | null
}

export type PayrollRunRecord = HrBaseRecord & {
  factoryId: string
  payGroupId: string
  processingMode: "INDIVIDUAL" | "BULK"
  selectionCriteria: {
    employeeIds?: string[]
    departmentIds?: string[]
    designationIds?: string[]
    sectionNames?: string[]
    includeAllEligible?: boolean
  }
  formulaInputs?: Record<string, number>
  snapshotMetadata?: Record<string, unknown>
  frequency: string
  runType: string
  sequence: number
  periodStart: string
  periodEnd: string
  paymentDate: string
  status: string
  currency: string
  rulePackId?: string | null
  paidStatus: string
  factory?: { name?: string; displayName?: string; code?: string }
  totals?: {
    employees: string
    gross: string
    deductions: string
    net: string
    failed: string
  }
}

export type PayrollScopeEmployee = {
  id: string
  employeeCode: string
  employeeName: string
  departmentId?: string | null
  departmentName?: string | null
  designationId?: string | null
  designationName?: string | null
  sectionName?: string | null
}

export type PayrollScopeOptions = {
  employees: PayrollScopeEmployee[]
  departments: Array<{ id: string; name: string }>
  designations: Array<{ id: string; name: string }>
  sections: string[]
  formulaVariables: string[]
}

export type PayrollLineRecord = {
  id: string
  componentCode: string
  componentName: string
  type: string
  amount: string
  formula: string
  calculationTrace?: Record<string, unknown>
}

export type PayrollEmployeeRecord = {
  id: string
  employeeId: string
  employeeSnapshot: Record<string, unknown>
  inputSnapshot: Record<string, unknown>
  grossAmount: string
  deductionAmount: string
  employerContributionAmount: string
  netAmount: string
  warnings: string[]
  error?: string | null
  lines: PayrollLineRecord[]
}

export type HrJobRecord = {
  id: string
  type: string
  status: string
  progress: number
  attempts: number
  maxAttempts: number
  result?: Record<string, unknown> | null
  error?: string | null
  createdAt?: string
  updatedAt?: string
}

export type ReportRow = Record<string, unknown>
export type ReportResult = { items: ReportRow[]; meta: HrPaginationMeta }

export type LookupRecord = {
  id: string
  employeeCode?: string
  employeeName?: string
  email?: string
  code?: string
  name?: string
  displayName?: string
  isActive?: boolean
  settings?: Record<string, unknown>
}

