import { requireSelectedOrganizationId } from "@/lib/organization-selection"

import type { HrApiResponse } from "./hr.types"

export type HrRequestContext = {
  apiUrl: string
  accessToken: string
  organizationId: string
}

export function buildHrUrl(apiUrl: string, path: string, query?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path, apiUrl)
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value))
  })
  return url
}

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message
    if (Array.isArray(message)) return message.filter((item): item is string => typeof item === "string").join(" ") || fallback
    if (typeof message === "string" && message.trim()) return message
  }
  return fallback
}

function requireOrganizationId(value: string) {
  return requireSelectedOrganizationId(value)
}

export async function hrRequest<T>(
  context: HrRequestContext,
  path: string,
  options: RequestInit & { query?: Record<string, string | number | boolean | undefined> } = {},
): Promise<T> {
  const { query, ...requestOptions } = options
  const organizationId = requireOrganizationId(context.organizationId)
  const headers = new Headers(requestOptions.headers)
  headers.set("Authorization", `Bearer ${context.accessToken}`)
  headers.set("Accept", "application/json")
  headers.set("x-organization-id", organizationId)
  if (requestOptions.body && !(requestOptions.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(buildHrUrl(context.apiUrl, path, query), {
    ...requestOptions,
    headers,
    cache: "no-store",
  })
  let payload: HrApiResponse<T> | null = null
  try {
    payload = (await response.json()) as HrApiResponse<T>
  } catch {
    payload = null
  }

  if (response.status === 401) throw new Error("Your session expired. Please sign in again.")
  if (!response.ok || payload?.success !== true) {
    throw new Error(errorMessage(payload, "Unable to complete the HR and payroll request."))
  }
  if (payload.data === undefined || payload.data === null) {
    throw new Error("The server completed the request without returning data.")
  }
  return payload.data
}

export async function hrDownload(
  context: HrRequestContext,
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
) {
  const organizationId = requireOrganizationId(context.organizationId)
  const response = await fetch(buildHrUrl(context.apiUrl, path, query), {
    headers: {
      Authorization: `Bearer ${context.accessToken}`,
      "x-organization-id": organizationId,
    },
  })
  if (response.status === 401) throw new Error("Your session expired. Please sign in again.")
  if (!response.ok) {
    let payload: unknown = null
    try { payload = await response.json() } catch { payload = null }
    throw new Error(errorMessage(payload, "Unable to download the requested file."))
  }
  return response.blob()
}

export function saveBlob(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(objectUrl)
}

