import type { ApiResponse, JobAiAssistResult, JobFilterValues, JobFormValues, JobNumberSummary, JobPoDetailsUploadReport, JobPoSummaryResult, JobRecord, NextJobNumber, PaginatedResponse } from "./job.types"
import type { AiAssistMasterDataMatches } from "./component/job-ai-assist.store"

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

export class JobPoDetailsUploadReportError extends Error {
  report: JobPoDetailsUploadReport

  constructor(message: string, report: JobPoDetailsUploadReport) {
    super(message)
    this.name = "JobPoDetailsUploadReportError"
    this.report = report
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isJobPoDetailsUploadReport(value: unknown): value is JobPoDetailsUploadReport {
  if (!isRecord(value)) return false
  const missing = value.missing
  return (
    typeof value.inserted === "number" &&
    typeof value.skipped === "number" &&
    Array.isArray(value.rows) &&
    (!isRecord(missing) ||
      ((!missing.styles || isStringArray(missing.styles)) &&
        (!missing.colors || isStringArray(missing.colors)) &&
        (!missing.sizes || isStringArray(missing.sizes))))
  )
}

function extractJobPoDetailsUploadReport(payload: unknown, depth = 0): JobPoDetailsUploadReport | null {
  if (depth > 3) return null
  if (isJobPoDetailsUploadReport(payload)) return payload
  if (!isRecord(payload)) return null
  return (
    extractJobPoDetailsUploadReport(payload.uploadReport, depth + 1) ||
    extractJobPoDetailsUploadReport(payload.data, depth + 1) ||
    extractJobPoDetailsUploadReport(payload.response, depth + 1) ||
    extractJobPoDetailsUploadReport(payload.message, depth + 1)
  )
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) return payload
  if (Array.isArray(payload)) {
    const messages = payload.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    return messages.length ? messages.join(" ") : fallback
  }
  if (!isRecord(payload)) return fallback
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message
  if (Array.isArray(payload.message) || isRecord(payload.message)) return extractErrorMessage(payload.message, fallback)
  if (isRecord(payload.response)) return extractErrorMessage(payload.response, fallback)
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error
  return fallback
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

function normalizeNumber(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue ? Number(trimmedValue) : 0
}

function buildJobPayload(values: JobFormValues) {
  return {
    jobNo: optionalString(values.jobNo),
    factoryId: values.factoryId.trim(),
    buyerId: values.buyerId.trim(),
    merchandiserId: optionalString(values.merchandiserId),
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
      cuttingLimitPercentage: normalizeNumber(detail.cuttingLimitPercentage),
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

export async function fetchJobNumbersByBuyer({
  apiUrl,
  accessToken,
  buyerId,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  buyerId: string
  organizationId?: string
}): Promise<JobNumberSummary[]> {
  const url = buildApiUrl(apiUrl, "/api/v1/job/numbers-by-buyer")
  url.searchParams.set("buyerId", buyerId.trim())

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<JobNumberSummary[]>(response)
  if (!Array.isArray(payload.data)) throw new Error("The job number list was returned without data.")
  return payload.data
}

export async function fetchNextJobNumber({
  apiUrl,
  accessToken,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
}): Promise<NextJobNumber> {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/job/next-number"), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<NextJobNumber>(response)
  if (!payload.data) throw new Error("The next job number was not returned.")
  return payload.data
}

export async function fetchJobPoSummary({
  apiUrl,
  accessToken,
  pono,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  pono: string
  organizationId?: string
}): Promise<JobPoSummaryResult> {
  const url = buildApiUrl(apiUrl, "/api/v1/job/po-summary")
  url.searchParams.set("pono", pono.trim())

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<JobPoSummaryResult>(response)
  if (!payload.data) throw new Error("No PO summary was returned for this request.")
  return payload.data
}

export async function downloadJobPoDetailsUploadTemplate({
  apiUrl,
  accessToken,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/job/po-details/template/upload"), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  if (response.status === 401) throw new Error("Your session expired. Please sign in again.")
  if (response.status === 403) throw new Error("You do not have permission to download the PO details template.")
  if (!response.ok) throw new Error("Unable to download the PO details upload template right now.")

  return response.blob()
}

export async function uploadJobPoDetailsTemplate({
  apiUrl,
  accessToken,
  file,
  buyerId,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  file: File
  buyerId?: string
  organizationId?: string
}): Promise<JobPoDetailsUploadReport> {
  const formData = new FormData()
  formData.append("file", file)
  if (buyerId?.trim()) formData.append("buyerId", buyerId.trim())

  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/job/po-details/upload"), {
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

  if (response.status === 401) throw new Error("Your session expired. Please sign in again.")
  if (response.status === 403) throw new Error(extractErrorMessage(payload, "You do not have permission to upload PO details."))

  if (!response.ok) {
    const uploadReport = extractJobPoDetailsUploadReport(payload)
    const message = extractErrorMessage(payload, "PO details upload could not be completed.")
    if (uploadReport) throw new JobPoDetailsUploadReportError(message, uploadReport)
    throw new Error(message)
  }

  if (!isRecord(payload) || payload.success !== true) {
    throw new Error(extractErrorMessage(payload, "Unable to upload the PO details template right now."))
  }

  const uploadReport = extractJobPoDetailsUploadReport(payload.data)
  if (!uploadReport) throw new Error("The PO details upload completed without a summary.")

  return uploadReport
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

export async function analyzeJobAiAssistFile({
  apiUrl,
  accessToken,
  file,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  file: File
  organizationId?: string
}): Promise<JobAiAssistResult> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/job/ai-assist"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    body: formData,
  })

  const payload = await readJsonResponse<JobAiAssistResult>(response)
  if (!payload.data?.rows) throw new Error("AI Assist finished, but no PO detail rows were returned.")
  return payload.data
}

export async function resolveJobAiAssistRow({
  apiUrl,
  accessToken,
  row,
  buyerId,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  row: {
    poNumber: string
    styleNo: string
    styleName: string
    color: string
    size: string
    quantity: number | string
    deliveryDate: string | null
    fob: number | string | null
  }
  buyerId?: string
  organizationId?: string
}): Promise<AiAssistMasterDataMatches> {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/job/ai-assist/resolve-row"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify({
      poNumber: row.poNumber,
      styleNo: row.styleNo,
      styleName: row.styleName,
      color: row.color,
      size: row.size,
      quantity: row.quantity,
      deliveryDate: row.deliveryDate,
      fob: row.fob,
      buyerId,
    }),
  })

  const payload = await readJsonResponse<AiAssistMasterDataMatches>(response)
  if (!payload.data) throw new Error("AI Assist resolved the row, but no master data response was returned.")
  return payload.data
}
