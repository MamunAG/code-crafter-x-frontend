import type { MasterDataConfig } from "./master-data.types"

const yesNoEligibility = [
  { key: "overtimeEligible", label: "Overtime eligible", kind: "boolean" as const, defaultValue: false },
]

export const MASTER_DATA_CONFIGS = {
  employmentType: {
    slug: "employment-type", apiPath: "employment-types", title: "Employment Type Setup", singular: "employment type",
    description: "Maintain employment categories and their default eligibility rules.", permissionMenuName: "Employment Type Setup",
    fields: [
      { key: "description", label: "Description", kind: "text" },
      { key: "color", label: "Color", kind: "text", placeholder: "#2563eb" },
      { key: "sortOrder", label: "Sort order", kind: "number", min: 0, max: 9999, defaultValue: 0 },
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
      { key: "hourlyAllowed", label: "Allow hourly leave", kind: "boolean", defaultValue: false },
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
      { key: "documentationRequiredAfterDays", label: "Document required after days", kind: "number", min: 0, step: 0.5, defaultValue: 0 },
      { key: "noticePeriodDays", label: "Advance notice days", kind: "number", min: 0, max: 730, defaultValue: 0 },
      { key: "maxConsecutiveDays", label: "Maximum consecutive days", kind: "number", min: 0, step: 0.5, defaultValue: 0 },
    ],
  },
  leavePolicy: {
    slug: "leave-policy", apiPath: "leave-policies", title: "Leave Policies", singular: "leave policy", description: "Manage effective-dated policies and backend-authoritative rules by leave type.", permissionMenuName: "Leave Management",
    fields: [
      { key: "effectiveFrom", label: "Effective from", kind: "date", defaultValue: new Date().toISOString().slice(0, 10) },
      { key: "effectiveTo", label: "Effective to", kind: "date" },
      { key: "status", label: "Status", kind: "select", defaultValue: "DRAFT", options: ["DRAFT", "ACTIVE", "INACTIVE"].map((value) => ({ label: value, value })) },
      { key: "rules", label: "Policy rules", kind: "policy-rules", defaultValue: [], description: "Entitlement, accrual, limits, notice, documentation, carry-forward, and eligibility rules." },
    ],
  },
  leavePolicyAssignment: {
    slug: "leave-policy-assignment", apiPath: "leave-policy-assignments", title: "Policy Assignments", singular: "policy assignment", description: "Assign effective-dated leave policies to employees and retain assignment history.", permissionMenuName: "Leave Management",
    fields: [
      { key: "employeeId", label: "Employee ID", kind: "text", placeholder: "Employee UUID" }, { key: "policyId", label: "Leave policy ID", kind: "text", placeholder: "Policy UUID" }, { key: "effectiveFrom", label: "Effective from", kind: "date", defaultValue: new Date().toISOString().slice(0, 10) }, { key: "effectiveTo", label: "Effective to", kind: "date" }, { key: "active", label: "Active", kind: "boolean", defaultValue: true },
    ],
  },
  leaveWorkflow: {
    slug: "leave-workflow", apiPath: "leave-workflows", title: "Approval Workflows", singular: "approval workflow", description: "Build ordered leave approval levels without adding a drag-and-drop dependency.", permissionMenuName: "Leave Management",
    fields: [
      { key: "active", label: "Active", kind: "boolean", defaultValue: true },
      { key: "levels", label: "Workflow levels", kind: "workflow-levels", defaultValue: [{ levelNumber: 1, name: "Reporting Manager", approverType: "REPORTING_MANAGER", minimumApprovals: 1, mandatory: true, allowSelfApproval: false, canReject: true, canReturn: true, notifications: true }], description: "Ordered approval levels with conditional approver selectors." },
    ],
  },
  leaveWorkflowAssignment: {
    slug: "leave-workflow-assignment", apiPath: "leave-workflow-assignments", title: "Workflow Assignments", singular: "workflow assignment", description: "Assign workflows from company through employee scope with explicit resolution priority.", permissionMenuName: "Leave Management",
    fields: [
      { key: "targetType", label: "Target type", kind: "select", defaultValue: "COMPANY", options: ["COMPANY", "FACTORY", "DEPARTMENT", "SECTION", "DESIGNATION", "EMPLOYEE"].map((value) => ({ label: value, value })) }, { key: "targetId", label: "Target ID", kind: "text", placeholder: "Blank for company; UUID for other targets" }, { key: "workflowId", label: "Workflow ID", kind: "text", placeholder: "Workflow UUID" }, { key: "effectiveFrom", label: "Effective from", kind: "date" }, { key: "effectiveTo", label: "Effective to", kind: "date" }, { key: "priority", label: "Resolution priority", kind: "number", min: 1, max: 6, defaultValue: 1 },
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
