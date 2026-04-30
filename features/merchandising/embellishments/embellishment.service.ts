import type {
  ApiResponse,
  EmbellishmentFilterValues,
  EmbellishmentFormValues,
  EmbellishmentRecord,
  PaginatedResponse,
} from "./embellishment.types"

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
    throw new Error(payload?.message || "You do not have permission to complete this embellishment action.")
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Unable to complete the embellishment request right now.")
  }

  return payload
}

function appendFilterParams(url: URL, filters: Partial<EmbellishmentFilterValues>) {
  const name = filters.name?.trim() ?? ""
  const remarks = filters.remarks?.trim() ?? ""

  if (name) {
    url.searchParams.set("name", name)
  }

  if (remarks) {
    url.searchParams.set("remarks", remarks)
  }
}

function mapActiveStatus(value: boolean) {
  return value ? "Y" : "N"
}

export async function fetchEmbellishments({
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
  filters: Partial<EmbellishmentFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<EmbellishmentRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/embellishment")
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

  const payload = await readJsonResponse<PaginatedResponse<EmbellishmentRecord>>(response)

  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The embellishment list was returned without pagination data.")
  }

  return payload.data
}

export async function fetchEmbellishment({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: number
  organizationId?: string
}): Promise<EmbellishmentRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/embellishment/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<EmbellishmentRecord>(response)

  if (!payload.data) {
    throw new Error("The embellishment record was returned without data.")
  }

  return payload.data
}

export async function createEmbellishment({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: EmbellishmentFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/embellishment"), {
    method: "POST",
    headers: buildRequestHeaders({
      accessToken,
      organizationId,
      contentType: "application/json",
    }),
    body: JSON.stringify({
      name: payload.name.trim(),
      remarks: payload.remarks.trim() || undefined,
      isActive: mapActiveStatus(payload.isActive),
    }),
  })

  const payloadData = await readJsonResponse<EmbellishmentRecord>(response)

  if (!payloadData.data) {
    throw new Error("The embellishment was saved, but the created record was not returned.")
  }

  return payloadData.data
}

export async function updateEmbellishment({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: number
  payload: EmbellishmentFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/embellishment/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({
      accessToken,
      organizationId,
      contentType: "application/json",
    }),
    body: JSON.stringify({
      name: payload.name.trim(),
      remarks: payload.remarks.trim() || undefined,
      isActive: mapActiveStatus(payload.isActive),
    }),
  })

  const payloadData = await readJsonResponse<EmbellishmentRecord>(response)

  if (!payloadData.data) {
    throw new Error("The embellishment was updated, but the updated record was not returned.")
  }

  return payloadData.data
}

export async function softDeleteEmbellishment({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/embellishment/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function restoreEmbellishment({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/embellishment/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function permanentlyDeleteEmbellishment({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/embellishment/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}
