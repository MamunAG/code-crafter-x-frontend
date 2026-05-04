import type { ApiResponse, JobFilterValues, JobFormValues, JobRecord, PaginatedResponse } from "./job.types"

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
  if (response.status === 403) throw new Error(payload?.message || "You do not have permission to complete this purchase order action.")
  if (!response.ok || !payload?.success) throw new Error(payload?.message || "Unable to complete the purchase order request right now.")

  return payload
}

function appendFilterParams(url: URL, filters: Partial<JobFilterValues>) {
  if (filters.factoryId?.trim()) url.searchParams.set("factoryId", filters.factoryId.trim())
  if (filters.buyerId?.trim()) url.searchParams.set("buyerId", filters.buyerId.trim())
  if (filters.merchandiserId?.trim()) url.searchParams.set("merchandiserId", filters.merchandiserId.trim())
  if (filters.ordertype?.trim()) url.searchParams.set("ordertype", filters.ordertype.trim())
  if (filters.pono?.trim()) url.searchParams.set("pono", filters.pono.trim())
  if (filters.isActive?.trim()) url.searchParams.set("isActive", filters.isActive.trim())
}

function optionalString(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function optionalNumber(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue ? Number(trimmedValue) : undefined
}

function normalizeNumber(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue ? Number(trimmedValue) : 0
}

function buildJobPayload(values: JobFormValues) {
  return {
    factoryId: values.factoryId.trim(),
    buyerId: values.buyerId.trim(),
    merchandiserId: optionalNumber(values.merchandiserId),
    ordertype: optionalString(values.ordertype),
    totalPoQty: normalizeNumber(values.totalPoQty),
    poReceiveDate: optionalString(values.poReceiveDate),
    isActive: values.isActive,
    jobDetails: values.jobDetails.map((detail) => ({
      pono: detail.pono.trim(),
      styleId: detail.styleId.trim(),
      sizeId: Number(detail.sizeId),
      colorId: Number(detail.colorId),
      quantity: normalizeNumber(detail.quantity),
      fob: normalizeNumber(detail.fob),
      cm: normalizeNumber(detail.cm),
      deliveryDate: optionalString(detail.deliveryDate),
      remarks: optionalString(detail.remarks),
    })),
  }
}

export async function fetchJobs({
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
  filters: Partial<JobFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<JobRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/job")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) url.searchParams.set("deletedOnly", "true")
  appendFilterParams(url, filters)

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<PaginatedResponse<JobRecord>>(response)
  if (!payload.data?.items || !payload.data?.meta) throw new Error("The purchase order list was returned without pagination data.")
  return payload.data
}

export async function fetchJob({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  organizationId?: string
}): Promise<JobRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/job/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<JobRecord>(response)
  if (!payload.data) throw new Error("The purchase order record was returned without data.")
  return payload.data
}

export async function createJob({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: JobFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/job"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildJobPayload(payload)),
  })

  const payloadData = await readJsonResponse<JobRecord>(response)
  if (!payloadData.data) throw new Error("The purchase order was saved, but the created record was not returned.")
  return payloadData.data
}

export async function updateJob({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: JobFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/job/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildJobPayload(payload)),
  })

  const payloadData = await readJsonResponse<JobRecord>(response)
  if (!payloadData.data) throw new Error("The purchase order was updated, but the updated record was not returned.")
  return payloadData.data
}

export async function softDeleteJob({ apiUrl, accessToken, id, organizationId }: { apiUrl: string; accessToken: string; id: string; organizationId?: string }) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/job/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })
  await readJsonResponse(response)
}

export async function restoreJob({ apiUrl, accessToken, id, organizationId }: { apiUrl: string; accessToken: string; id: string; organizationId?: string }) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/job/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })
  await readJsonResponse(response)
}

export async function permanentlyDeleteJob({ apiUrl, accessToken, id, organizationId }: { apiUrl: string; accessToken: string; id: string; organizationId?: string }) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/job/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })
  await readJsonResponse(response)
}
