import { hrRequest, type HrRequestContext } from "../shared/hr-api"

export type AttendancePullTargetField =
  | "externalEventId"
  | "employeeId"
  | "employeeCode"
  | "punchedAt"
  | "direction"
  | "deviceIdentifier"
  | "metadata"

export type AttendancePullMapping = {
  sourcePath: string
  targetField: AttendancePullTargetField
}

export type AttendancePullPayload = {
  integrationId?: string
  name: string
  source: string
  endpointUrl: string
  method: "GET" | "POST"
  headers: Record<string, unknown>
  query: Record<string, unknown>
  body?: unknown
  secret?: {
    location: "HEADER" | "QUERY" | "BODY"
    key: string
    value?: string
  }
  responseItemsPath?: string | null
  mappings: AttendancePullMapping[]
  directionMap: Record<string, string>
  cursorResponsePath?: string | null
  scheduleIntervalMinutes?: number | null
  isActive: boolean
}

export type AttendancePullIntegration = {
  id: string
  name: string
  source: string
  endpointUrl: string
  method: "GET" | "POST"
  requestConfig: {
    headers: Record<string, unknown>
    query: Record<string, unknown>
    body?: unknown
    secret?: {
      location: "HEADER" | "QUERY" | "BODY"
      key: string
      value: string
      configured?: boolean
    }
  }
  responseItemsPath?: string | null
  mappings: AttendancePullMapping[]
  directionMap: Record<string, string>
  cursorResponsePath?: string | null
  lastCursor?: string | null
  scheduleIntervalMinutes?: number | null
  isActive: boolean
  nextRunAt?: string | null
  lastRunAt?: string | null
  lastSuccessAt?: string | null
  lastStatus?: string | null
  lastError?: string | null
  lastResult?: Record<string, unknown> | null
}

export type AttendancePullTestResult = {
  itemCount: number
  availablePaths: string[]
  sample: unknown[]
  mappedPreview: unknown[]
  cursorPreview?: unknown
}

const path = "/api/v1/hr/attendance/pull-integrations"

export function listAttendancePullIntegrations(context: HrRequestContext) {
  return hrRequest<AttendancePullIntegration[]>(context, path)
}

export function saveAttendancePullIntegration(
  context: HrRequestContext,
  payload: AttendancePullPayload,
  id?: string
) {
  return hrRequest<AttendancePullIntegration>(
    context,
    id ? `${path}/${id}` : path,
    {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    }
  )
}

export function testAttendancePullIntegration(
  context: HrRequestContext,
  payload: AttendancePullPayload
) {
  return hrRequest<AttendancePullTestResult>(context, `${path}/test-request`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function syncAttendancePullIntegration(
  context: HrRequestContext,
  id: string
) {
  return hrRequest<Record<string, unknown>>(context, `${path}/${id}/sync`, {
    method: "POST",
  })
}

export function deleteAttendancePullIntegration(
  context: HrRequestContext,
  id: string
) {
  return hrRequest<{ deleted: boolean }>(context, `${path}/${id}`, {
    method: "DELETE",
  })
}
