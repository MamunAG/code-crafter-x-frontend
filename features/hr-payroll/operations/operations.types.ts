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
  employeeId: string
  leaveTypeId: string
  startDate: string
  endDate: string
  days: string
  isHalfDay: boolean
  reason?: string | null
  status: string
  approvalLevel: number
  requiredApprovalLevels: number
  approvalHistory?: Array<Record<string, unknown>>
}

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
  code?: string
  name?: string
  displayName?: string
  isActive?: boolean
}

