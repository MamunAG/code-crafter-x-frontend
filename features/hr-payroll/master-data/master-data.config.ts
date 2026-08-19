import type { MasterDataConfig } from "./master-data.types"

const yesNoEligibility = [
  { key: "overtimeEligible", label: "Overtime eligible", kind: "boolean" as const, defaultValue: false },
]

export const MASTER_DATA_CONFIGS = {
  employmentType: {
    slug: "employment-type", apiPath: "employment-types", title: "Employment Type Setup", singular: "employment type",
    description: "Maintain employment categories and their default eligibility rules.", permissionMenuName: "Employment Type Setup",
    fields: [
      { key: "employmentCategory", label: "Employment category", kind: "select", defaultValue: "PERMANENT", options: ["PERMANENT", "CONTRACT", "TEMPORARY", "PROBATION", "INTERN", "CASUAL"].map((value) => ({ label: value.replaceAll("_", " "), value })) },
      { key: "defaultProbationDays", label: "Default probation days", kind: "number", min: 0, max: 730, defaultValue: 0 },
      ...yesNoEligibility,
      { key: "leaveEligible", label: "Leave eligible", kind: "boolean", defaultValue: true },
      { key: "benefitsEligible", label: "Benefits eligible", kind: "boolean", defaultValue: true },
    ],
  },
  grade: {
    slug: "grade", apiPath: "grades", title: "Grade Setup", singular: "grade", description: "Maintain employee grades and hierarchy.", permissionMenuName: "Grade Setup",
    fields: [
      { key: "rank", label: "Rank / display order", kind: "number", min: 1, max: 9999, defaultValue: 1 },
      { key: "managementLevel", label: "Management level", kind: "text", placeholder: "For example: Worker, Officer, Manager" },
      ...yesNoEligibility,
    ],
  },
  payGroup: {
    slug: "pay-group", apiPath: "pay-groups", title: "Pay Group Setup", singular: "pay group", description: "Configure payroll frequencies and cutoff defaults.", permissionMenuName: "Pay Group Setup",
    fields: [
      { key: "frequency", label: "Payroll frequency", kind: "select", defaultValue: "MONTHLY", options: ["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY"].map((value) => ({ label: value.replaceAll("_", " "), value })) },
      { key: "cutoffRule", label: "Cutoff rule", kind: "text", placeholder: "For example: Last calendar day" },
      { key: "paymentOffsetDays", label: "Payment offset days", kind: "number", min: 0, max: 90, defaultValue: 0 },
      { key: "defaultWorkingDays", label: "Default working days", kind: "number", min: 0, max: 31, step: 0.5, defaultValue: 26 },
    ],
  },
  workLocation: {
    slug: "work-location", apiPath: "work-locations", title: "Work Location Setup", singular: "work location", description: "Maintain factories, offices, and other employee work locations.", permissionMenuName: "Work Location Setup",
    fields: [
      { key: "locationType", label: "Location type", kind: "select", defaultValue: "FACTORY", options: ["FACTORY", "OFFICE", "WAREHOUSE", "REMOTE", "OTHER"].map((value) => ({ label: value, value })) },
      { key: "factoryId", label: "Linked factory ID", kind: "text", placeholder: "Optional factory UUID" },
      { key: "address", label: "Address", kind: "text" },
      { key: "district", label: "District", kind: "text" },
      { key: "timezone", label: "Timezone", kind: "text", defaultValue: "Asia/Dhaka", placeholder: "Asia/Dhaka" },
    ],
  },
  holidayCalendar: {
    slug: "holiday-calendar", apiPath: "holiday-calendars", title: "Holiday Calendar Setup", singular: "holiday calendar", description: "Maintain yearly holidays and weekly rest days.", permissionMenuName: "Holiday Calendar Setup",
    fields: [
      { key: "year", label: "Calendar year", kind: "number", min: 2000, max: 2200, defaultValue: new Date().getFullYear() },
      { key: "weeklyRestDays", label: "Weekly rest days", kind: "weekday-multi", defaultValue: [5] },
      { key: "holidays", label: "Holiday dates", kind: "holidays", defaultValue: [] },
    ],
  },
  leaveType: {
    slug: "leave-type", apiPath: "leave-types", title: "Leave Type Setup", singular: "leave type", description: "Configure leave balance, approval, and entitlement policies.", permissionMenuName: "Leave Type Setup",
    fields: [
      { key: "leaveClassification", label: "Classification", kind: "select", defaultValue: "PAID", options: ["PAID", "UNPAID"].map((value) => ({ label: value, value })) },
      { key: "dayUnit", label: "Unit", kind: "select", defaultValue: "DAY", options: ["DAY", "HOUR"].map((value) => ({ label: value, value })) },
      { key: "countCalendarDays", label: "Count calendar days", kind: "boolean", defaultValue: true },
      { key: "approvalLevels", label: "Approval levels", kind: "number", min: 1, max: 3, defaultValue: 1 },
      { key: "allowNegativeBalance", label: "Allow negative balance", kind: "boolean", defaultValue: false },
      { key: "accrualFrequency", label: "Accrual frequency", kind: "select", defaultValue: "NONE", options: ["NONE", "MONTHLY", "QUARTERLY", "YEARLY"].map((value) => ({ label: value, value })) },
      { key: "accrualRate", label: "Accrual rate", kind: "number", min: 0, step: 0.01, defaultValue: 0 },
      { key: "carryForwardAllowed", label: "Allow carry forward", kind: "boolean", defaultValue: false },
      { key: "carryForwardCap", label: "Carry-forward cap", kind: "number", min: 0, step: 0.5, defaultValue: 0 },
      { key: "expiryMonths", label: "Expiry months", kind: "number", min: 0, max: 120, defaultValue: 0 },
      { key: "encashable", label: "Encashable", kind: "boolean", defaultValue: false },
      { key: "halfDayAllowed", label: "Allow half day", kind: "boolean", defaultValue: true },
      { key: "attachmentRequired", label: "Attachment required", kind: "boolean", defaultValue: false },
      { key: "maxConsecutiveDays", label: "Maximum consecutive days", kind: "number", min: 0, step: 0.5, defaultValue: 0 },
    ],
  },
  salaryComponent: {
    slug: "salary-component", apiPath: "salary-components", title: "Salary Component Setup", singular: "salary component", description: "Define payroll earning, deduction, and contribution components.", permissionMenuName: "Salary Component Setup",
    fields: [
      { key: "componentType", label: "Component type", kind: "select", defaultValue: "EARNING", options: ["EARNING", "DEDUCTION", "EMPLOYER_CONTRIBUTION", "INFORMATIONAL"].map((value) => ({ label: value.replaceAll("_", " "), value })) },
      { key: "calculationMethod", label: "Calculation method", kind: "select", defaultValue: "FIXED", options: ["FIXED", "PERCENTAGE", "FORMULA"].map((value) => ({ label: value, value })) },
      { key: "formula", label: "Default formula", kind: "text", placeholder: "Optional safe payroll formula" },
      { key: "taxable", label: "Taxable", kind: "boolean", defaultValue: false },
      { key: "recurring", label: "Recurring", kind: "boolean", defaultValue: true },
      { key: "prorated", label: "Prorated", kind: "boolean", defaultValue: true },
      { key: "affectsGross", label: "Affects gross pay", kind: "boolean", defaultValue: true },
      { key: "roundingPrecision", label: "Rounding precision", kind: "number", min: 0, max: 4, defaultValue: 2 },
    ],
  },
  separationReason: {
    slug: "separation-reason", apiPath: "separation-reasons", title: "Separation Reason Setup", singular: "separation reason", description: "Maintain employee separation reasons and default notice rules.", permissionMenuName: "Separation Reason Setup",
    fields: [
      { key: "separationCategory", label: "Category", kind: "select", defaultValue: "VOLUNTARY", options: ["VOLUNTARY", "INVOLUNTARY", "RETIREMENT", "OTHER"].map((value) => ({ label: value, value })) },
      { key: "eligibleForRehire", label: "Eligible for rehire", kind: "boolean", defaultValue: true },
      { key: "noticeRequired", label: "Notice required", kind: "boolean", defaultValue: true },
      { key: "defaultNoticeDays", label: "Default notice days", kind: "number", min: 0, max: 730, defaultValue: 30 },
    ],
  },
} satisfies Record<string, MasterDataConfig>
