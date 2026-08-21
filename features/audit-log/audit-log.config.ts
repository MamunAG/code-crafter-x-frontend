export type AuditModuleName = string

export type AuditLogModuleConfig = {
  moduleName: AuditModuleName
  endpoint: string
  eyebrow: string
  title: string
  moduleLabel: string
  description: string
  activityDescription: string
  showModuleColumn?: boolean
  showModuleFilter?: boolean
}

export const AUDIT_LOG_MODULES = {
  hrPayroll: {
    moduleName: "HR_PAYROLL",
    endpoint: "/api/v1/audit-log",
    eyebrow: "HR & Payroll",
    title: "HR Audit Log",
    moduleLabel: "HR and payroll",
    description:
      "All retained HR and payroll API, business, and scheduled-job activity for the selected organization.",
    activityDescription:
      "API requests, business actions, and scheduled jobs for the selected organization.",
  },
  merchandising: {
    moduleName: "MERCHANDISING",
    endpoint: "/api/v1/audit-log",
    eyebrow: "Merchandising",
    title: "Merchandising Audit Log",
    moduleLabel: "merchandising",
    description:
      "All retained merchandising API and business activity for the selected organization.",
    activityDescription:
      "API requests and business actions across merchandising operations.",
  },
  iam: {
    moduleName: "ALL",
    endpoint: "/api/v1/audit-log",
    eyebrow: "IAM",
    title: "Organization Audit Log",
    moduleLabel: "organization-wide",
    description:
      "All retained activity across every module for the selected organization.",
    activityDescription:
      "API requests, business actions, and scheduled jobs across all modules.",
    showModuleColumn: true,
    showModuleFilter: true,
  },
} as const satisfies Record<string, AuditLogModuleConfig>
