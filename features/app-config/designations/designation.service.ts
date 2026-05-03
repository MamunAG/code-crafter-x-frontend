import type {
  ApiResponse,
  DesignationFilterValues,
  DesignationFormValues,
  DesignationRecord,
  PaginatedResponse,
} from "./designation.types"

function buildApiUrl(apiUrl: string, path: string) {
  return new URL(path, apiUrl)
}

function buildRequestHeaders({
  accessToken,
  organizationId,
  contentType,
}: {
  accessToken: string
  organizationId?: string
  contentType?: string
}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  }

  if (contentType) headers["Content-Type"] = contentType
  if (organizationId) headers["x-organization-id"] = organizationId

  return headers
}

async function readJsonResponse<T>(response: Response) {
  let payload: ApiResponse<T> | null = null

  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (response.status === 401) throw new Error("Your session expired. Please sign in again.")
  if (response.status === 403) throw new Error(payload?.message || "You do not have permission to complete this designation action.")
  if (!response.ok || !payload?.success) throw new Error(payload?.message || "Unable to complete the designation request right now.")

  return payload
}

function appendFilterParams(url: URL, filters: Partial<DesignationFilterValues>) {
  if (filters.designationName?.trim()) url.searchParams.set("designationName", filters.designationName.trim())
  if (filters.isActive?.trim()) url.searchParams.set("isActive", filters.isActive.trim())
}

function optionalString(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function buildDesignationPayload(payload: DesignationFormValues) {
  return {
    designationName: payload.designationName.trim(),
    description: optionalString(payload.description),
    isActive: payload.isActive,
  }
}

export async function fetchDesignations({
  apiUrl,
  accessToken,
  page,
  limit,
  filters,
  deletedOnly = false,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  page: number
  limit: number
  filters: Partial<DesignationFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<DesignationRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/hr/designation")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) url.searchParams.set("deletedOnly", "true")
  appendFilterParams(url, filters)

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<PaginatedResponse<DesignationRecord>>(response)
  if (!payload.data?.items || !payload.data?.meta) throw new Error("The designation list was returned without pagination data.")
  return payload.data
}

export async function fetchDesignation({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  organizationId?: string
}): Promise<DesignationRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/designation/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<DesignationRecord>(response)
  if (!payload.data) throw new Error("The designation record was returned without data.")
  return payload.data
}

export async function createDesignation({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: DesignationFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/hr/designation"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildDesignationPayload(payload)),
  })

  const payloadData = await readJsonResponse<DesignationRecord>(response)
  if (!payloadData.data) throw new Error("The designation was saved, but the created record was not returned.")
  return payloadData.data
}

export async function updateDesignation({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: DesignationFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/designation/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildDesignationPayload(payload)),
  })

  const payloadData = await readJsonResponse<DesignationRecord>(response)
  if (!payloadData.data) throw new Error("The designation was updated, but the updated record was not returned.")
  return payloadData.data
}

export async function softDeleteDesignation({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/designation/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })
  await readJsonResponse(response)
}

export async function restoreDesignation({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/designation/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })
  await readJsonResponse(response)
}

export async function permanentlyDeleteDesignation({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/designation/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })
  await readJsonResponse(response)
}
