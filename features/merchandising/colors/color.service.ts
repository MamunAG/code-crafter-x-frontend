import type {
  ApiResponse,
  ColorFilterValues,
  ColorFormValues,
  ColorRecord,
  PaginatedResponse,
} from "./color.types"

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
    throw new Error(payload?.message || "You do not have permission to complete this color action.")
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Unable to complete the color request right now.")
  }

  return payload
}

function appendFilterParams(url: URL, filters: Partial<ColorFilterValues>) {
  const colorName = filters.colorName?.trim() ?? ""
  const colorDisplayName = filters.colorDisplayName?.trim() ?? ""
  const colorDescription = filters.colorDescription?.trim() ?? ""

  if (colorName) {
    url.searchParams.set("colorName", colorName)
  }

  if (colorDisplayName) {
    url.searchParams.set("colorDisplayName", colorDisplayName)
  }

  if (colorDescription) {
    url.searchParams.set("colorDescription", colorDescription)
  }
}

function normalizeHexColorCode(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  return trimmed.startsWith("#") ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`
}

export async function fetchColors({
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
  filters: Partial<ColorFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<ColorRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/color")
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

  const payload = await readJsonResponse<PaginatedResponse<ColorRecord>>(response)

  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The color list was returned without pagination data.")
  }

  return payload.data
}

export async function fetchColor({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: number
  organizationId?: string
}): Promise<ColorRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/color/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<ColorRecord>(response)

  if (!payload.data) {
    throw new Error("The color record was returned without data.")
  }

  return payload.data
}

export async function createColor({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: ColorFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/color"), {
    method: "POST",
    headers: buildRequestHeaders({
      accessToken,
      organizationId,
      contentType: "application/json",
    }),
    body: JSON.stringify({
      colorName: payload.colorName.trim(),
      colorDisplayName: payload.colorDisplayName.trim() || undefined,
      colorDescription: payload.colorDescription.trim() || undefined,
      colorHexCode: normalizeHexColorCode(payload.colorHexCode),
      isActive: payload.isActive,
    }),
  })

  const payloadData = await readJsonResponse<ColorRecord>(response)

  if (!payloadData.data) {
    throw new Error("The color was saved, but the created record was not returned.")
  }

  return payloadData.data
}

export async function updateColor({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: number
  payload: ColorFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/color/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({
      accessToken,
      organizationId,
      contentType: "application/json",
    }),
    body: JSON.stringify({
      colorName: payload.colorName.trim(),
      colorDisplayName: payload.colorDisplayName.trim() || undefined,
      colorDescription: payload.colorDescription.trim() || undefined,
      colorHexCode: normalizeHexColorCode(payload.colorHexCode),
      isActive: payload.isActive,
    }),
  })

  const payloadData = await readJsonResponse<ColorRecord>(response)

  if (!payloadData.data) {
    throw new Error("The color was updated, but the updated record was not returned.")
  }

  return payloadData.data
}

export async function softDeleteColor({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/color/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function restoreColor({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/color/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function permanentlyDeleteColor({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/color/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}
