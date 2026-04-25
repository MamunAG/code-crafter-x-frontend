import type {
  ApiResponse,
  PaginatedResponse,
  SizeFilterValues,
  SizeFormValues,
  SizeRecord,
} from "./size.types"

function buildApiUrl(apiUrl: string, path: string) {
  return new URL(path, apiUrl)
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
    throw new Error(payload?.message || "Unable to complete the size request right now.")
  }

  return payload
}

function appendFilterParams(url: URL, filters: Partial<SizeFilterValues>) {
  const sizeName = filters.sizeName?.trim() ?? ""

  if (sizeName) {
    url.searchParams.set("sizeName", sizeName)
  }
}

export async function fetchSizes({
  apiUrl,
  accessToken,
  page,
  limit,
  filters,
  deletedOnly = false,
}: {
  apiUrl: string
  accessToken: string
  page: number
  limit: number
  filters: Partial<SizeFilterValues>
  deletedOnly?: boolean
}): Promise<PaginatedResponse<SizeRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/size")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) {
    url.searchParams.set("deletedOnly", "true")
  }
  appendFilterParams(url, filters)

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const payload = await readJsonResponse<PaginatedResponse<SizeRecord>>(response)

  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The size list was returned without pagination data.")
  }

  return payload.data
}

export async function fetchSize({
  apiUrl,
  accessToken,
  id,
}: {
  apiUrl: string
  accessToken: string
  id: number
}): Promise<SizeRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/size/${id}`), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const payload = await readJsonResponse<SizeRecord>(response)

  if (!payload.data) {
    throw new Error("The size record was returned without data.")
  }

  return payload.data
}

export async function createSize({
  apiUrl,
  accessToken,
  payload,
}: {
  apiUrl: string
  accessToken: string
  payload: SizeFormValues
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/size"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sizeName: payload.sizeName.trim(),
      isActive: payload.isActive,
    }),
  })

  const payloadData = await readJsonResponse<SizeRecord>(response)

  if (!payloadData.data) {
    throw new Error("The size was saved, but the created record was not returned.")
  }

  return payloadData.data
}

export async function updateSize({
  apiUrl,
  accessToken,
  id,
  payload,
}: {
  apiUrl: string
  accessToken: string
  id: number
  payload: SizeFormValues
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/size/${id}`), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sizeName: payload.sizeName.trim(),
      isActive: payload.isActive,
    }),
  })

  const payloadData = await readJsonResponse<SizeRecord>(response)

  if (!payloadData.data) {
    throw new Error("The size was updated, but the updated record was not returned.")
  }

  return payloadData.data
}

export async function softDeleteSize({
  apiUrl,
  accessToken,
  id,
}: {
  apiUrl: string
  accessToken: string
  id: number
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/size/${id}`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  await readJsonResponse(response)
}

export async function restoreSize({
  apiUrl,
  accessToken,
  id,
}: {
  apiUrl: string
  accessToken: string
  id: number
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/size/${id}/restore`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  await readJsonResponse(response)
}

export async function permanentlyDeleteSize({
  apiUrl,
  accessToken,
  id,
}: {
  apiUrl: string
  accessToken: string
  id: number
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/size/${id}/permanent`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  await readJsonResponse(response)
}
