import type {
  ApiResponse,
  CountryFilterValues,
  CountryFormValues,
  CountryRecord,
  PaginatedResponse,
} from "./country.types"

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
    throw new Error(payload?.message || "You do not have permission to complete this country action.")
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Unable to complete the country request right now.")
  }

  return payload
}

function appendFilterParams(url: URL, filters: Partial<CountryFilterValues>) {
  const name = filters.name?.trim() ?? ""

  if (name) {
    url.searchParams.set("name", name)
  }
}

export async function fetchCountries({
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
  filters: Partial<CountryFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<CountryRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/country")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) url.searchParams.set("deletedOnly", "true")
  appendFilterParams(url, filters)

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<PaginatedResponse<CountryRecord>>(response)

  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The country list was returned without pagination data.")
  }

  return payload.data
}

export async function fetchCountry({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: number
  organizationId?: string
}): Promise<CountryRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/country/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<CountryRecord>(response)

  if (!payload.data) {
    throw new Error("The country record was returned without data.")
  }

  return payload.data
}

export async function createCountry({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: CountryFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/country"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify({
      name: payload.name.trim(),
      isActive: payload.isActive,
    }),
  })

  const payloadData = await readJsonResponse<CountryRecord>(response)

  if (!payloadData.data) {
    throw new Error("The country was saved, but the created record was not returned.")
  }

  return payloadData.data
}

export async function downloadCountryUploadTemplate({
  apiUrl,
  accessToken,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/country/template/upload"), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (response.status === 403) {
    throw new Error("You do not have permission to download the country template.")
  }

  if (!response.ok) {
    throw new Error("Unable to download the country upload template right now.")
  }

  return response.blob()
}

export async function uploadCountryTemplate({
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

  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/country/upload"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    body: formData,
  })

  const payload = await readJsonResponse<{ inserted: number; skipped: number }>(response)

  if (!payload.data) {
    throw new Error("The country upload completed without a summary.")
  }

  return payload.data
}

export async function updateCountry({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: number
  payload: CountryFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/country/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify({
      name: payload.name.trim(),
      isActive: payload.isActive,
    }),
  })

  const payloadData = await readJsonResponse<CountryRecord>(response)

  if (!payloadData.data) {
    throw new Error("The country was updated, but the updated record was not returned.")
  }

  return payloadData.data
}

export async function softDeleteCountry({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/country/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function restoreCountry({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/country/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function permanentlyDeleteCountry({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/country/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}
