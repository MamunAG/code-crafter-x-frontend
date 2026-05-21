import type {
  ApiResponse,
  OrderPlacementFilterValues,
  OrderPlacementFormValues,
  OrderPlacementRecord,
  PaginatedResponse,
} from "./order-placement.types"

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
  if (response.status === 403) throw new Error(payload?.message || "You do not have permission to complete this order placement action.")
  if (!response.ok || !payload?.success) throw new Error(payload?.message || "Unable to complete the order placement request right now.")

  return payload
}

function appendFilterParams(url: URL, filters: Partial<OrderPlacementFilterValues>) {
  if (filters.buyerId?.trim()) url.searchParams.set("buyerId", filters.buyerId.trim())
  if (filters.jobId?.trim()) url.searchParams.set("jobId", filters.jobId.trim())
  if (filters.currencyId?.trim()) url.searchParams.set("currencyId", filters.currencyId.trim())
  if (filters.factoryId?.trim()) url.searchParams.set("factoryId", filters.factoryId.trim())
  if (filters.placementDate?.trim()) url.searchParams.set("placementDate", filters.placementDate.trim())
  if (filters.isPlaced?.trim()) url.searchParams.set("isPlaced", filters.isPlaced.trim())
  if (filters.pono?.trim()) url.searchParams.set("pono", filters.pono.trim())
}

function optionalString(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function normalizeNumber(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue ? Number(trimmedValue) : 0
}

function buildOrderPlacementPayload(values: OrderPlacementFormValues) {
  return {
    buyerId: values.buyerId.trim(),
    jobId: values.jobId.trim(),
    currencyId: Number(values.currencyId),
    placementDate: values.placementDate,
    factoryId: values.factoryId.trim(),
    isPlaced: values.isPlaced,
    orderPlacementDetails: values.orderPlacementDetails.map((detail) => ({
      id: detail.id.length === 36 ? detail.id : undefined,
      jobDetailId: optionalString(detail.jobDetailId),
      jobId: detail.jobId.trim(),
      poId: detail.poId.trim(),
      styleId: detail.styleId.trim(),
      sizeId: Number(detail.sizeId),
      colorId: Number(detail.colorId),
      quantity: normalizeNumber(detail.quantity),
      fob: normalizeNumber(detail.fob),
      cm: normalizeNumber(detail.cm),
      deliveryDate: optionalString(detail.deliveryDate),
      cuttingLimitPercentage: normalizeNumber(detail.cuttingLimitPercentage),
      remarks: optionalString(detail.remarks),
      factoryCm: normalizeNumber(detail.factoryCm),
      factoryFob: normalizeNumber(detail.factoryFob),
      factoryShipmentDate: optionalString(detail.factoryShipmentDate),
      totalFactoryCm: normalizeNumber(detail.totalFactoryCm),
      totalFactoryFob: normalizeNumber(detail.totalFactoryFob),
    })),
  }
}

export async function fetchOrderPlacements({
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
  filters: Partial<OrderPlacementFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<OrderPlacementRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/order-placement")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) url.searchParams.set("deletedOnly", "true")
  appendFilterParams(url, filters)

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<PaginatedResponse<OrderPlacementRecord>>(response)
  if (!payload.data?.items || !payload.data?.meta) throw new Error("The order placement list was returned without pagination data.")
  return payload.data
}

export async function fetchOrderPlacement({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/order-placement/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<OrderPlacementRecord>(response)
  if (!payload.data) throw new Error("The order placement record was returned without data.")
  return payload.data
}

export async function createOrderPlacement({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: OrderPlacementFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/order-placement"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildOrderPlacementPayload(payload)),
  })

  const payloadData = await readJsonResponse<OrderPlacementRecord>(response)
  if (!payloadData.data) throw new Error("The order placement was saved, but the created record was not returned.")
  return payloadData.data
}

export async function updateOrderPlacement({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: OrderPlacementFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/order-placement/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildOrderPlacementPayload(payload)),
  })

  const payloadData = await readJsonResponse<OrderPlacementRecord>(response)
  if (!payloadData.data) throw new Error("The order placement was updated, but the updated record was not returned.")
  return payloadData.data
}

export async function softDeleteOrderPlacement({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/order-placement/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })
  await readJsonResponse(response)
}

export async function restoreOrderPlacement({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/order-placement/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })
  await readJsonResponse(response)
}

export async function permanentlyDeleteOrderPlacement({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/order-placement/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })
  await readJsonResponse(response)
}
