import type { AuditModuleName } from "./audit-log.config"

export type AuditEvent = {
  id: string
  moduleName: AuditModuleName
  category: "API" | "BUSINESS" | "CRON"
  status: "STARTED" | "SUCCESS" | "ERROR" | "ABORTED"
  organizationId: string | null
  actorId: string | null
  actorName: string | null
  action: string
  subjectType: string
  subjectId: string
  httpMethod: string | null
  route: string | null
  statusCode: number | null
  requestId: string | null
  durationMs: number | null
  errorCode: string | null
  errorMessage: string | null
  clientIp: string | null
  userAgent: string | null
  jobName: string | null
  schedule: string | null
  runId: string | null
  scheduledFor: string | null
  startedAt: string | null
  completedAt: string | null
  scheduleStatus: "ON_SCHEDULE" | "DELAYED" | "MISSED" | "FAILED" | null
  metadata: Record<string, unknown>
  createdAt: string
}

export type AuditFeed = {
  generatedAt: string
  page: number
  limit: number
  total: number
  totalPages: number
  stats: {
    total: number
    cronTotal: number
    cronOnSchedule: number
    issues: number
  }
  events: AuditEvent[]
}

export type AuditFilters = {
  page: number
  limit: number
  category?: AuditEvent["category"]
  status?: AuditEvent["status"]
  scheduleStatus?: Exclude<AuditEvent["scheduleStatus"], null>
  fromDate?: string
  toDate?: string
}
