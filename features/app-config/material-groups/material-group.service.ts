import type {
  ApiResponse,
  MaterialGroupFilterValues,
  MaterialGroupFormValues,
  MaterialGroupRecord,
  PaginatedResponse,
} from "./material-group.types"

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

  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (response.status === 403) {
    throw new Error(
      payload?.message ||
        "You do not have permission to complete this material group action."
    )
  }

  if (!response.ok || !payload?.success) {
    throw new Error(
      payload?.message ||
        "Unable to complete the material group request right now."
    )
  }

  return payload
}

function appendFilterParams(
  url: URL,
  filters: Partial<MaterialGroupFilterValues>
) {
  if (filters.name?.trim()) url.searchParams.set("name", filters.name.trim())
  if (filters.description?.trim()) {
    url.searchParams.set("description", filters.description.trim())
  }
  if (filters.isActive?.trim()) {
    url.searchParams.set("isActive", filters.isActive.trim())
  }
}

function buildMaterialGroupPayload(payload: MaterialGroupFormValues) {
  return {
    name: payload.name.trim(),
    description: payload.description.trim() || undefined,
    isActive: payload.isActive,
  }
}

export async function fetchMaterialGroups({
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
  filters: Partial<MaterialGroupFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<MaterialGroupRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/material-group")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) url.searchParams.set("deletedOnly", "true")
  appendFilterParams(url, filters)

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload =
    await readJsonResponse<PaginatedResponse<MaterialGroupRecord>>(response)

  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error(
      "The material group list was returned without pagination data."
    )
  }

  return payload.data
}

export async function fetchMaterialGroup({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  organizationId?: string
}): Promise<MaterialGroupRecord> {
  const response = await fetch(
    buildApiUrl(apiUrl, `/api/v1/material-group/${id}`),
    {
      method: "GET",
      headers: buildRequestHeaders({ accessToken, organizationId }),
      cache: "no-store",
    }
  )

  const payload = await readJsonResponse<MaterialGroupRecord>(response)
  if (!payload.data) {
    throw new Error("The material group record was returned without data.")
  }

  return payload.data
}

export async function createMaterialGroup({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: MaterialGroupFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/material-group"), {
    method: "POST",
    headers: buildRequestHeaders({
      accessToken,
      organizationId,
      contentType: "application/json",
    }),
    body: JSON.stringify(buildMaterialGroupPayload(payload)),
  })

  const payloadData = await readJsonResponse<MaterialGroupRecord>(response)
  if (!payloadData.data) {
    throw new Error(
      "The material group was saved, but the created record was not returned."
    )
  }

  return payloadData.data
}

export async function updateMaterialGroup({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: MaterialGroupFormValues
  organizationId?: string
}) {
  const response = await fetch(
    buildApiUrl(apiUrl, `/api/v1/material-group/${id}`),
    {
      method: "PATCH",
      headers: buildRequestHeaders({
        accessToken,
        organizationId,
        contentType: "application/json",
      }),
      body: JSON.stringify(buildMaterialGroupPayload(payload)),
    }
  )

  const payloadData = await readJsonResponse<MaterialGroupRecord>(response)
  if (!payloadData.data) {
    throw new Error(
      "The material group was updated, but the updated record was not returned."
    )
  }

  return payloadData.data
}

export async function softDeleteMaterialGroup({
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
  const response = await fetch(
    buildApiUrl(apiUrl, `/api/v1/material-group/${id}`),
    {
      method: "DELETE",
      headers: buildRequestHeaders({ accessToken, organizationId }),
    }
  )

  await readJsonResponse(response)
}
