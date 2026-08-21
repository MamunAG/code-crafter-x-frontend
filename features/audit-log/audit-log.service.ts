import { requireSelectedOrganizationId } from "@/lib/organization-selection"
import type { AuditFeed, AuditFilters } from "./audit-log.types"

export type AuditRequestContext = {
  apiUrl: string
  accessToken: string
  organizationId: string
}

type ApiResponse<T> = {
  success: boolean
  message?: string | string[]
  data?: T
}

function buildUrl(
  apiUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>
) {
  const url = new URL(path, apiUrl)
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value))
    }
  })
  return url
}

function responseError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message
    if (Array.isArray(message)) {
      return (
        message
          .filter((item): item is string => typeof item === "string")
          .join(" ") || fallback
      )
    }
    if (typeof message === "string" && message.trim()) return message
  }
  return fallback
}

async function auditRequest<T>(
  context: AuditRequestContext,
  path: string,
  options: RequestInit & {
    query?: Record<string, string | number | boolean | undefined>
  } = {}
) {
  const { query, ...requestOptions } = options
  const headers = new Headers(requestOptions.headers)
  headers.set("Authorization", `Bearer ${context.accessToken}`)
  headers.set("Accept", "application/json")
  headers.set(
    "x-organization-id",
    requireSelectedOrganizationId(context.organizationId)
  )
  if (requestOptions.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const response = await fetch(buildUrl(context.apiUrl, path, query), {
    ...requestOptions,
    headers,
    cache: "no-store",
  })
  let payload: ApiResponse<T> | null = null
  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }
  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again.")
  }
  if (!response.ok || payload?.success !== true) {
    throw new Error(
      responseError(payload, "Unable to complete the audit-log request.")
    )
  }
  if (payload.data === undefined || payload.data === null) {
    throw new Error("The server completed the request without returning data.")
  }
  return payload.data
}

function normalizeAuditDeletionError(error: unknown): never {
  if (
    error instanceof Error &&
    error.message.toLowerCase().includes("cannot delete")
  ) {
    throw new Error(
      "Audit-log deletion is unavailable on the current backend version. Deploy the latest backend release, then try again."
    )
  }
  throw error
}

export function getAuditLog(
  context: AuditRequestContext,
  endpoint: string,
  moduleName: string | undefined,
  filters: AuditFilters
) {
  return auditRequest<AuditFeed>(context, endpoint, {
    query: { ...filters, moduleName },
  })
}

export async function deleteSelectedAuditLogs(
  context: AuditRequestContext,
  endpoint: string,
  moduleName: string | undefined,
  ids: string[]
) {
  try {
    return await auditRequest<{ deleted: number }>(
      context,
      `${endpoint}/selected`,
      {
        method: "DELETE",
        query: { moduleName },
        body: JSON.stringify({ ids }),
      }
    )
  } catch (error) {
    normalizeAuditDeletionError(error)
  }
}

export async function deleteAllAuditLogs(
  context: AuditRequestContext,
  endpoint: string,
  moduleName: string | undefined
) {
  try {
    return await auditRequest<{ deleted: number }>(context, `${endpoint}/all`, {
      method: "DELETE",
      query: { moduleName },
    })
  } catch (error) {
    normalizeAuditDeletionError(error)
  }
}
