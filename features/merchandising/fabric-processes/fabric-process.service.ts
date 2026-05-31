import type {
  ApiResponse,
  FabricProcessFilterValues,
  FabricProcessFormValues,
  FabricProcessRecord,
  PaginatedResponse,
} from "./fabric-process.types"

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
    throw new Error(payload?.message || "Unable to complete the fabric process request right now.")
  }

  return payload
}

function appendFilterParams(url: URL, filters: Partial<FabricProcessFilterValues>) {
  const name = filters.name?.trim() ?? ""
  const isActive = filters.isActive?.trim() ?? ""

  if (name) url.searchParams.set("name", name)
  if (isActive) url.searchParams.set("isActive", isActive)
}

export async function fetchFabricProcesses({
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
  filters: Partial<FabricProcessFilterValues>
  deletedOnly?: boolean
}): Promise<PaginatedResponse<FabricProcessRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/fabric-process")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) url.searchParams.set("deletedOnly", "true")
  appendFilterParams(url, filters)

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<PaginatedResponse<FabricProcessRecord>>(response)

  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The fabric process list was returned without pagination data.")
  }

  return payload.data
}

export async function fetchFabricProcess({
  apiUrl,
  accessToken,
  organizationId,
  id,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
  id: number
}): Promise<FabricProcessRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/fabric-process/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<FabricProcessRecord>(response)

  if (!payload.data) {
    throw new Error("The fabric process record was returned without data.")
  }

  return payload.data
}

export async function createFabricProcess({
  apiUrl,
  accessToken,
  organizationId,
  payload,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
  payload: FabricProcessFormValues
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/fabric-process"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify({
      name: payload.name.trim(),
      stage: payload.stage,
      sortOrder: Number(payload.sortOrder || 0),
      isActive: payload.isActive,
    }),
  })

  const payloadData = await readJsonResponse<FabricProcessRecord>(response)

  if (!payloadData.data) {
    throw new Error("The fabric process was saved, but the created record was not returned.")
  }

  return payloadData.data
}

export async function updateFabricProcess({
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
  payload: FabricProcessFormValues
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/fabric-process/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify({
      name: payload.name.trim(),
      stage: payload.stage,
      sortOrder: Number(payload.sortOrder || 0),
      isActive: payload.isActive,
    }),
  })

  const payloadData = await readJsonResponse<FabricProcessRecord>(response)

  if (!payloadData.data) {
    throw new Error("The fabric process was updated, but the updated record was not returned.")
  }

  return payloadData.data
}

export async function softDeleteFabricProcess({ apiUrl, accessToken, organizationId, id }: { apiUrl: string; accessToken: string; organizationId?: string; id: number }) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/fabric-process/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function restoreFabricProcess({ apiUrl, accessToken, organizationId, id }: { apiUrl: string; accessToken: string; organizationId?: string; id: number }) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/fabric-process/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function permanentlyDeleteFabricProcess({ apiUrl, accessToken, organizationId, id }: { apiUrl: string; accessToken: string; organizationId?: string; id: number }) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/fabric-process/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}
