import type { ApiResponse, CurrencyFilterValues, CurrencyFormValues, CurrencyRecord, PaginatedResponse } from "./currency.types"

function buildApiUrl(apiUrl: string, path: string) {
  return new URL(path, apiUrl)
}

function buildRequestHeaders({ accessToken, organizationId, contentType }: { accessToken: string; organizationId?: string; contentType?: string }) {
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
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
  if (response.status === 403) throw new Error(payload?.message || "You do not have permission to complete this currency action.")
  if (!response.ok || !payload?.success) throw new Error(payload?.message || "Unable to complete the currency request right now.")
  return payload
}

function appendFilterParams(url: URL, filters: Partial<CurrencyFilterValues>) {
  const currencyName = filters.currencyName?.trim() ?? ""
  const currencyCode = filters.currencyCode?.trim() ?? ""
  const symbol = filters.symbol?.trim() ?? ""
  if (currencyName) url.searchParams.set("currencyName", currencyName)
  if (currencyCode) url.searchParams.set("currencyCode", currencyCode)
  if (symbol) url.searchParams.set("symbol", symbol)
}

function buildPayload(payload: CurrencyFormValues) {
  return {
    currencyName: payload.currencyName.trim(),
    currencyCode: payload.currencyCode.trim().toUpperCase(),
    rate: Number(payload.rate),
    symbol: payload.symbol.trim(),
    isDefault: payload.isDefault,
    isActive: payload.isActive,
  }
}

export async function fetchCurrencies({ apiUrl, accessToken, page, limit, filters, deletedOnly = false, organizationId }: { apiUrl: string; accessToken: string; page: number; limit: number; filters: Partial<CurrencyFilterValues>; deletedOnly?: boolean; organizationId?: string }): Promise<PaginatedResponse<CurrencyRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/currency")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) url.searchParams.set("deletedOnly", "true")
  appendFilterParams(url, filters)
  const response = await fetch(url, { method: "GET", headers: buildRequestHeaders({ accessToken, organizationId }), cache: "no-store" })
  const payload = await readJsonResponse<PaginatedResponse<CurrencyRecord>>(response)
  if (!payload.data?.items || !payload.data?.meta) throw new Error("The currency list was returned without pagination data.")
  return payload.data
}

export async function fetchCurrency({ apiUrl, accessToken, id, organizationId }: { apiUrl: string; accessToken: string; id: number; organizationId?: string }): Promise<CurrencyRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/currency/${id}`), { method: "GET", headers: buildRequestHeaders({ accessToken, organizationId }), cache: "no-store" })
  const payload = await readJsonResponse<CurrencyRecord>(response)
  if (!payload.data) throw new Error("The currency record was returned without data.")
  return payload.data
}

export async function createCurrency({ apiUrl, accessToken, payload, organizationId }: { apiUrl: string; accessToken: string; payload: CurrencyFormValues; organizationId?: string }) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/currency"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildPayload(payload)),
  })
  const payloadData = await readJsonResponse<CurrencyRecord>(response)
  if (!payloadData.data) throw new Error("The currency was saved, but the created record was not returned.")
  return payloadData.data
}

export async function updateCurrency({ apiUrl, accessToken, id, payload, organizationId }: { apiUrl: string; accessToken: string; id: number; payload: CurrencyFormValues; organizationId?: string }) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/currency/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildPayload(payload)),
  })
  const payloadData = await readJsonResponse<CurrencyRecord>(response)
  if (!payloadData.data) throw new Error("The currency was updated, but the updated record was not returned.")
  return payloadData.data
}

export async function softDeleteCurrency({ apiUrl, accessToken, id, organizationId }: { apiUrl: string; accessToken: string; id: number; organizationId?: string }) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/currency/${id}`), { method: "DELETE", headers: buildRequestHeaders({ accessToken, organizationId }) })
  await readJsonResponse(response)
}

export async function restoreCurrency({ apiUrl, accessToken, id, organizationId }: { apiUrl: string; accessToken: string; id: number; organizationId?: string }) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/currency/${id}/restore`), { method: "POST", headers: buildRequestHeaders({ accessToken, organizationId }) })
  await readJsonResponse(response)
}

export async function permanentlyDeleteCurrency({ apiUrl, accessToken, id, organizationId }: { apiUrl: string; accessToken: string; id: number; organizationId?: string }) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/currency/${id}/permanent`), { method: "DELETE", headers: buildRequestHeaders({ accessToken, organizationId }) })
  await readJsonResponse(response)
}
