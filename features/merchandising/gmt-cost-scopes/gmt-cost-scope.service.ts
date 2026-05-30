import type {
  ApiResponse,
  GmtCostScopeFilterValues,
  GmtCostScopeFormValues,
  GmtCostScopeRecord,
  PaginatedResponse,
} from "./gmt-cost-scope.types"

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

  if (response.status === 401 || response.status === 403) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Unable to complete the GMT cost scope request right now.")
  }

  return payload
}

function appendFilterParams(url: URL, filters: Partial<GmtCostScopeFilterValues>) {
  const name = filters.name?.trim() ?? ""
  const isActive = filters.isActive?.trim() ?? ""

  if (name) url.searchParams.set("name", name)
  if (isActive) url.searchParams.set("isActive", isActive)
}

export async function fetchGmtCostScopes({
  apiUrl,
  accessToken,
  organizationId,
  page,
  limit,
  filters,
  deletedOnly = false,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
  page: number
  limit: number
  filters: Partial<GmtCostScopeFilterValues>
  deletedOnly?: boolean
}): Promise<PaginatedResponse<GmtCostScopeRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/gmt-cost-scope")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) url.searchParams.set("deletedOnly", "true")
  appendFilterParams(url, filters)

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<PaginatedResponse<GmtCostScopeRecord>>(response)

  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The GMT cost scope list was returned without pagination data.")
  }

  return payload.data
}

export async function fetchGmtCostScope({
  apiUrl,
  accessToken,
  organizationId,
  id,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
  id: number
}): Promise<GmtCostScopeRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/gmt-cost-scope/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<GmtCostScopeRecord>(response)

  if (!payload.data) {
    throw new Error("The GMT cost scope record was returned without data.")
  }

  return payload.data
}

export async function createGmtCostScope({
  apiUrl,
  accessToken,
  organizationId,
  payload,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
  payload: GmtCostScopeFormValues
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/gmt-cost-scope"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify({ name: payload.name.trim(), isActive: payload.isActive }),
  })

  const payloadData = await readJsonResponse<GmtCostScopeRecord>(response)

  if (!payloadData.data) {
    throw new Error("The GMT cost scope was saved, but the created record was not returned.")
  }

  return payloadData.data
}

export async function updateGmtCostScope({
  apiUrl,
  accessToken,
  organizationId,
  id,
  payload,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
  id: number
  payload: GmtCostScopeFormValues
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/gmt-cost-scope/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify({ name: payload.name.trim(), isActive: payload.isActive }),
  })

  const payloadData = await readJsonResponse<GmtCostScopeRecord>(response)

  if (!payloadData.data) {
    throw new Error("The GMT cost scope was updated, but the updated record was not returned.")
  }

  return payloadData.data
}

export async function softDeleteGmtCostScope({ apiUrl, accessToken, organizationId, id }: { apiUrl: string; accessToken: string; organizationId?: string; id: number }) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/gmt-cost-scope/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function restoreGmtCostScope({ apiUrl, accessToken, organizationId, id }: { apiUrl: string; accessToken: string; organizationId?: string; id: number }) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/gmt-cost-scope/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function permanentlyDeleteGmtCostScope({ apiUrl, accessToken, organizationId, id }: { apiUrl: string; accessToken: string; organizationId?: string; id: number }) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/gmt-cost-scope/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}