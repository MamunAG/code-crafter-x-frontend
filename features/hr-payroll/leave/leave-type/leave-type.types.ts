import type { MasterDataRecord } from "../../master-data/master-data.types"

export type LeaveTypeSettings = {
  description: string
  color: string
  sortOrder: number
  leaveClassification: "PAID" | "UNPAID"
  dayUnit: "DAY" | "HOUR"
  hourlyAllowed: boolean
  countCalendarDays: boolean
  approvalLevels: number
  allowNegativeBalance: boolean
  accrualFrequency: "NONE" | "MONTHLY" | "QUARTERLY" | "YEARLY"
  accrualRate: number
  carryForwardAllowed: boolean
  carryForwardCap: number
  expiryMonths: number
  encashable: boolean
  halfDayAllowed: boolean
  attachmentRequired: boolean
  documentationRequiredAfterDays: number
  noticePeriodDays: number
  maxConsecutiveDays: number
}

export type LeaveTypeRecord = Omit<MasterDataRecord, "settings"> & { settings: Partial<LeaveTypeSettings> }
export type LeaveTypeFormValues = { code: string; name: string; nameBn: string; isActive: boolean; rowVersion?: number; settings: LeaveTypeSettings }

export const EMPTY_LEAVE_TYPE: LeaveTypeFormValues = {
  code: "", name: "", nameBn: "", isActive: true,
  settings: { description: "", color: "", sortOrder: 0, leaveClassification: "PAID", dayUnit: "DAY", hourlyAllowed: false, countCalendarDays: true, approvalLevels: 1, allowNegativeBalance: false, accrualFrequency: "NONE", accrualRate: 0, carryForwardAllowed: false, carryForwardCap: 0, expiryMonths: 0, encashable: false, halfDayAllowed: true, attachmentRequired: false, documentationRequiredAfterDays: 0, noticePeriodDays: 0, maxConsecutiveDays: 0 },
}
