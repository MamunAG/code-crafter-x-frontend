import type {
  ApiResponse,
  BuyerFilterValues,
  BuyerFormValues,
  BuyerRecord,
  PaginatedResponse,
} from "./buyer.types"

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
    throw new Error(payload?.message || "You do not have permission to complete this buyer action.")
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Unable to complete the buyer request right now.")
  }

  return payload
}

function appendFilterParams(url: URL, filters: Partial<BuyerFilterValues>) {
  const name = filters.name?.trim() ?? ""
  const displayName = filters.displayName?.trim() ?? ""
  const contact = filters.contact?.trim() ?? ""
  const email = filters.email?.trim() ?? ""
  const countryId = filters.countryId?.trim() ?? ""
  const address = filters.address?.trim() ?? ""
  const isActive = filters.isActive?.trim() ?? ""
  const remarks = filters.remarks?.trim() ?? ""

  if (name) url.searchParams.set("name", name)
  if (displayName) url.searchParams.set("displayName", displayName)
  if (contact) url.searchParams.set("contact", contact)
  if (email) url.searchParams.set("email", email)
  if (countryId) url.searchParams.set("countryId", countryId)
  if (address) url.searchParams.set("address", address)
  if (isActive) url.searchParams.set("isActive", isActive)
  if (remarks) url.searchParams.set("remarks", remarks)
}

function optionalString(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || null
}

function optionalNumber(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue ? Number(trimmedValue) : null
}

function buildBuyerPayload(payload: BuyerFormValues) {
  return {
    name: payload.name.trim(),
    displayName: payload.displayName.trim(),
    contact: optionalString(payload.contact),
    email: optionalString(payload.email),
    countryId: optionalNumber(payload.countryId),
    address: optionalString(payload.address),
    remarks: optionalString(payload.remarks),
    isActive: payload.isActive,
  }
}

export async function fetchBuyers({
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
  filters: Partial<BuyerFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<BuyerRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/buyer")
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

  const payload = await readJsonResponse<PaginatedResponse<BuyerRecord>>(response)

  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The buyer list was returned without pagination data.")
  }

  return payload.data
}

export async function fetchBuyer({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  organizationId?: string
}): Promise<BuyerRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/buyer/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<BuyerRecord>(response)

  if (!payload.data) {
    throw new Error("The buyer record was returned without data.")
  }

  return payload.data
}

export async function createBuyer({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: BuyerFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/buyer"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildBuyerPayload(payload)),
  })

  const payloadData = await readJsonResponse<BuyerRecord>(response)

  if (!payloadData.data) {
    throw new Error("The buyer was saved, but the created record was not returned.")
  }

  return payloadData.data
}

export async function downloadBuyerUploadTemplate({
  apiUrl,
  accessToken,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/buyer/template/upload"), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (response.status === 403) {
    throw new Error("You do not have permission to download the buyer template.")
  }

  if (!response.ok) {
    throw new Error("Unable to download the buyer upload template right now.")
  }

  return response.blob()
}

export async function uploadBuyerTemplate({
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

  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/buyer/upload"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    body: formData,
  })

  const payload = await readJsonResponse<{ inserted: number; skipped: number }>(response)

  if (!payload.data) {
    throw new Error("The buyer upload completed without a summary.")
  }

  return payload.data
}

export async function updateBuyer({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: BuyerFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/buyer/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildBuyerPayload(payload)),
  })

  const payloadData = await readJsonResponse<BuyerRecord>(response)

  if (!payloadData.data) {
    throw new Error("The buyer was updated, but the updated record was not returned.")
  }

  return payloadData.data
}

export async function softDeleteBuyer({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/buyer/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function restoreBuyer({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/buyer/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function permanentlyDeleteBuyer({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/buyer/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}
