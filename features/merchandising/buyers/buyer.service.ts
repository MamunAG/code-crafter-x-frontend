import type {
  ApiResponse,
  BuyerFilterValues,
  BuyerFormValues,
  BuyerRecord,
  BuyerUploadReport,
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

export class BuyerUploadReportError extends Error {
  report: BuyerUploadReport

  constructor(message: string, report: BuyerUploadReport) {
    super(message)
    this.name = "BuyerUploadReportError"
    this.report = report
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isBuyerUploadReport(value: unknown): value is BuyerUploadReport {
  if (!isRecord(value)) {
    return false
  }

  const missing = value.missing

  return (
    typeof value.inserted === "number" &&
    typeof value.skipped === "number" &&
    (!isRecord(missing) || !missing.countries || isStringArray(missing.countries))
  )
}

function extractBuyerUploadReport(payload: unknown, depth = 0): BuyerUploadReport | null {
  if (depth > 3) {
    return null
  }

  if (isBuyerUploadReport(payload)) {
    return payload
  }

  if (!isRecord(payload)) {
    return null
  }

  return (
    extractBuyerUploadReport(payload.uploadReport, depth + 1) ||
    extractBuyerUploadReport(payload.data, depth + 1) ||
    extractBuyerUploadReport(payload.response, depth + 1) ||
    extractBuyerUploadReport(payload.message, depth + 1)
  )
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload
  }

  if (Array.isArray(payload)) {
    const messages = payload.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    )
    return messages.length ? messages.join(" ") : fallback
  }

  if (!isRecord(payload)) {
    return fallback
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message
  }

  if (Array.isArray(payload.message) || isRecord(payload.message)) {
    return extractErrorMessage(payload.message, fallback)
  }

  if (isRecord(payload.response)) {
    return extractErrorMessage(payload.response, fallback)
  }

  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error
  }

  return fallback
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
}): Promise<BuyerUploadReport> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/buyer/upload"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    body: formData,
  })

  let payload: unknown = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (response.status === 403) {
    throw new Error(extractErrorMessage(payload, "You do not have permission to upload buyers."))
  }

  if (!response.ok) {
    const uploadReport = extractBuyerUploadReport(payload)
    const message = extractErrorMessage(payload, "Buyer upload could not be completed.")

    if (uploadReport) {
      throw new BuyerUploadReportError(message, uploadReport)
    }

    throw new Error(message)
  }

  if (!isRecord(payload) || payload.success !== true) {
    throw new Error(extractErrorMessage(payload, "Unable to upload the buyer template right now."))
  }

  const uploadReport = extractBuyerUploadReport(payload.data)

  if (!uploadReport) {
    throw new Error("The buyer upload completed without a summary.")
  }

  return uploadReport
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
