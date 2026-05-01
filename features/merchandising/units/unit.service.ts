import type {
  ApiResponse,
  PaginatedResponse,
  UnitFilterValues,
  UnitFormValues,
  UnitRecord,
} from "./unit.types"

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

  if (contentType) {
    headers["Content-Type"] = contentType
  }

  if (organizationId) {
    headers["x-organization-id"] = organizationId
  }

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
    throw new Error(payload?.message || "You do not have permission to complete this unit action.")
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Unable to complete the unit request right now.")
  }

  return payload
}

function appendFilterParams(url: URL, filters: Partial<UnitFilterValues>) {
  const name = filters.name?.trim() ?? ""
  const shortName = filters.shortName?.trim() ?? ""
  const isActive = filters.isActive?.trim() ?? ""

  if (name) {
    url.searchParams.set("name", name)
  }

  if (shortName) {
    url.searchParams.set("shortName", shortName)
  }

  if (isActive) {
    url.searchParams.set("isActive", isActive)
  }
}

export async function fetchUnits({
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
  filters: Partial<UnitFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<UnitRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/unit")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) {
    url.searchParams.set("deletedOnly", "true")
  }
  appendFilterParams(url, filters)

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<PaginatedResponse<UnitRecord>>(response)

  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The unit list was returned without pagination data.")
  }

  return payload.data
}

export async function fetchUnit({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: number
  organizationId?: string
}): Promise<UnitRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/unit/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<UnitRecord>(response)

  if (!payload.data) {
    throw new Error("The unit record was returned without data.")
  }

  return payload.data
}

export async function createUnit({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: UnitFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/unit"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify({
      name: payload.name.trim(),
      shortName: payload.shortName.trim(),
      isActive: payload.isActive,
    }),
  })

  const payloadData = await readJsonResponse<UnitRecord>(response)

  if (!payloadData.data) {
    throw new Error("The unit was saved, but the created record was not returned.")
  }

  return payloadData.data
}

export async function downloadUnitUploadTemplate({
  apiUrl,
  accessToken,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/unit/template/upload"), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (response.status === 403) {
    throw new Error("You do not have permission to download the unit template.")
  }

  if (!response.ok) {
    throw new Error("Unable to download the unit upload template right now.")
  }

  return response.blob()
}

export async function uploadUnitTemplate({
  apiUrl,
  accessToken,
  file,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  file: File
  organizationId?: string
}): Promise<{ inserted: number; skipped: number }> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/unit/upload"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    body: formData,
  })

  const payload = await readJsonResponse<{ inserted: number; skipped: number }>(response)

  if (!payload.data) {
    throw new Error("The unit upload completed without a summary.")
  }

  return payload.data
}

export async function updateUnit({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: number
  payload: UnitFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/unit/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify({
      name: payload.name.trim(),
      shortName: payload.shortName.trim(),
      isActive: payload.isActive,
    }),
  })

  const payloadData = await readJsonResponse<UnitRecord>(response)

  if (!payloadData.data) {
    throw new Error("The unit was updated, but the updated record was not returned.")
  }

  return payloadData.data
}

export async function softDeleteUnit({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: number
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/unit/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function restoreUnit({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: number
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/unit/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function permanentlyDeleteUnit({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: number
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/unit/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}
