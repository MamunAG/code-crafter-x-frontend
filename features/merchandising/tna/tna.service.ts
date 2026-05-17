import type {
  ApiResponse,
  PaginatedResponse,
  TnaFilterValues,
  TnaFormValues,
  TnaRecord,
  TnaTaskRecord,
} from "./tna.types"

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
    throw new Error(payload?.message || "You do not have permission to complete this TNA action.")
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Unable to complete the TNA request right now.")
  }

  return payload
}

function appendFilterParams(url: URL, filters: Partial<TnaFilterValues>) {
  if (filters.buyerId?.trim()) url.searchParams.set("buyerId", filters.buyerId.trim())
  if (filters.jobId?.trim()) url.searchParams.set("jobId", filters.jobId.trim())
}

function optionalString(value: string) {
  const trimmed = value.trim()
  return trimmed || undefined
}

function normalizeNumber(value: string) {
  const trimmed = value.trim()
  return trimmed ? Number(trimmed) : 0
}

function buildTnaPayload(values: TnaFormValues) {
  return {
    buyerId: values.buyerId.trim(),
    jobId: values.jobId.trim(),
    leadTime: normalizeNumber(values.leadTime),
    tnaDetails: values.tnaDetails.map((detail, index) => ({
      taskId: detail.taskId.trim(),
      executionDate: detail.executionDate.trim(),
      days: normalizeNumber(detail.days),
      sortOrder: index + 1,
      relationFormula: optionalString(detail.relationFormula),
    })),
  }
}

export async function fetchTnaRecords({
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
  filters: Partial<TnaFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<TnaRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/tna")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) url.searchParams.set("deletedOnly", "true")
  appendFilterParams(url, filters)

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<PaginatedResponse<TnaRecord>>(response)
  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The TNA list was returned without pagination data.")
  }

  return payload.data
}

export async function fetchTnaRecord({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  organizationId?: string
}): Promise<TnaRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/tna/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<TnaRecord>(response)
  if (!payload.data) throw new Error("The TNA record was returned without data.")
  return payload.data
}

export async function createTna({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: TnaFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/tna"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildTnaPayload(payload)),
  })

  const payloadData = await readJsonResponse<TnaRecord>(response)
  if (!payloadData.data) throw new Error("The TNA was saved, but the created record was not returned.")
  return payloadData.data
}

export async function updateTna({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: TnaFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/tna/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildTnaPayload(payload)),
  })

  const payloadData = await readJsonResponse<TnaRecord>(response)
  if (!payloadData.data) throw new Error("The TNA was updated, but the updated record was not returned.")
  return payloadData.data
}

export async function softDeleteTna({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/tna/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function restoreTna({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/tna/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function permanentlyDeleteTna({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/tna/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function fetchTnaTasks({
  apiUrl,
  accessToken,
  page,
  limit,
  query,
  includeInactive = false,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  page: number
  limit: number
  query?: string
  includeInactive?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<TnaTaskRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/tna-task")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (!includeInactive) url.searchParams.set("isActive", "true")
  if (query?.trim()) {
    url.searchParams.set("name", query.trim())
  }

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<PaginatedResponse<TnaTaskRecord>>(response)
  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The TNA task list was returned without pagination data.")
  }

  return payload.data
}

function buildTnaTaskPayload(values: { name: string; isActive: boolean }) {
  return {
    name: values.name.trim(),
    isActive: values.isActive,
  }
}

export async function createTnaTask({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: { name: string; isActive: boolean }
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/tna-task"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildTnaTaskPayload(payload)),
  })

  const payloadData = await readJsonResponse<TnaTaskRecord>(response)
  if (!payloadData.data) throw new Error("The TNA task was saved, but the created task was not returned.")
  return payloadData.data
}

export async function updateTnaTask({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: { name: string; isActive: boolean }
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/tna-task/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildTnaTaskPayload(payload)),
  })

  const payloadData = await readJsonResponse<TnaTaskRecord>(response)
  if (!payloadData.data) throw new Error("The TNA task was updated, but the updated task was not returned.")
  return payloadData.data
}

export async function deleteTnaTask({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/tna-task/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

