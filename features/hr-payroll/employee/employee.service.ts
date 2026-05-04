import type {
  ApiResponse,
  EmployeeFilterValues,
  EmployeeFormValues,
  EmployeeUploadReport,
  EmployeeRecord,
  PaginatedResponse,
} from "./employee.types"

type BackendFileRecord = {
  success?: boolean
  file_id: number
  file_url: string
  thumbnail_url?: string
  original_name: string
  file_name: string
  file_size: number
  mime_type: string
  file_type: string
  file_category: string
  message?: string
  public_url?: string
  uploaded_by?: string
  uploaded_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export class EmployeeUploadReportError extends Error {
  report: EmployeeUploadReport

  constructor(message: string, report: EmployeeUploadReport) {
    super(message)
    this.name = "EmployeeUploadReportError"
    this.report = report
  }
}

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
    throw new Error(
      payload?.message || "You do not have permission to complete this employee action.",
    )
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Unable to complete the employee request right now.")
  }

  return payload
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isEmployeeUploadReport(value: unknown): value is EmployeeUploadReport {
  if (!isRecord(value)) {
    return false
  }

  const missing = value.missing

  return (
    typeof value.inserted === "number" &&
    typeof value.skipped === "number" &&
    (!isRecord(missing) ||
      ((!missing.factories || isStringArray(missing.factories)) &&
        (!missing.departments || isStringArray(missing.departments)) &&
        (!missing.designations || isStringArray(missing.designations))))
  )
}

function extractEmployeeUploadReport(payload: unknown, depth = 0): EmployeeUploadReport | null {
  if (depth > 3) {
    return null
  }

  if (isEmployeeUploadReport(payload)) {
    return payload
  }

  if (!isRecord(payload)) {
    return null
  }

  const possibleReport =
    extractEmployeeUploadReport(payload.uploadReport, depth + 1) ||
    extractEmployeeUploadReport(payload.data, depth + 1) ||
    extractEmployeeUploadReport(payload.response, depth + 1) ||
    extractEmployeeUploadReport(payload.message, depth + 1)

  return possibleReport
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

  if (Array.isArray(payload.message)) {
    return extractErrorMessage(payload.message, fallback)
  }

  if (isRecord(payload.message)) {
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

function appendFilterParams(url: URL, filters: Partial<EmployeeFilterValues>) {
  if (filters.factoryId?.trim()) url.searchParams.set("factoryId", filters.factoryId.trim())
  if (filters.employeeCode?.trim()) url.searchParams.set("employeeCode", filters.employeeCode.trim())
  if (filters.employeeName?.trim()) url.searchParams.set("employeeName", filters.employeeName.trim())
  if (filters.designationId?.trim()) url.searchParams.set("designationId", filters.designationId.trim())
  if (filters.departmentId?.trim()) url.searchParams.set("departmentId", filters.departmentId.trim())
  if (filters.gender?.trim()) url.searchParams.set("gender", filters.gender.trim())
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

function buildEmployeePayload(payload: EmployeeFormValues) {
  return {
    factoryId: payload.factoryId.trim(),
    imageId: optionalNumber(payload.imageId),
    employeeCode: payload.employeeCode.trim(),
    employeeName: payload.employeeName.trim(),
    designationId: optionalString(payload.designationId),
    departmentId: optionalString(payload.departmentId),
    phoneNo: optionalString(payload.phoneNo),
    email: optionalString(payload.email),
    gender: optionalString(payload.gender),
    joiningDate: optionalString(payload.joiningDate),
    nidNo: optionalString(payload.nidNo),
    address: optionalString(payload.address),
    remarks: optionalString(payload.remarks),
    isActive: payload.isActive,
  }
}

export async function fetchEmployees({
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
  filters: Partial<EmployeeFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<EmployeeRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/hr/employee")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))

  if (deletedOnly) url.searchParams.set("deletedOnly", "true")
  appendFilterParams(url, filters)

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<PaginatedResponse<EmployeeRecord>>(response)
  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The employee list was returned without pagination data.")
  }

  return payload.data
}

export async function uploadEmployeeImageFile({
  apiUrl,
  accessToken,
  file,
}: {
  apiUrl: string
  accessToken: string
  file: File
}): Promise<BackendFileRecord> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/files/upload"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken }),
    body: formData,
  })

  let payload: ApiResponse<BackendFileRecord> | null = null

  try {
    payload = (await response.json()) as ApiResponse<BackendFileRecord>
  } catch {
    payload = null
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (response.status === 413) {
    throw new Error("The selected image is too large. Please choose a smaller image.")
  }

  if (
    payload?.message?.toLowerCase().includes("file too large") ||
    payload?.message?.toLowerCase().includes("payload too large") ||
    payload?.message?.includes("LIMIT_FILE_SIZE")
  ) {
    throw new Error("The selected image is too large. Please choose a smaller image.")
  }

  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(payload?.message || "Unable to save the uploaded image right now.")
  }

  return payload.data
}

export async function fetchEmployee({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  organizationId?: string
}): Promise<EmployeeRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/employee/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<EmployeeRecord>(response)
  if (!payload.data) {
    throw new Error("The employee record was returned without data.")
  }

  return payload.data
}

export async function createEmployee({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: EmployeeFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/hr/employee"), {
    method: "POST",
    headers: buildRequestHeaders({
      accessToken,
      organizationId,
      contentType: "application/json",
    }),
    body: JSON.stringify(buildEmployeePayload(payload)),
  })

  const payloadData = await readJsonResponse<EmployeeRecord>(response)
  if (!payloadData.data) {
    throw new Error("The employee was saved, but the created record was not returned.")
  }

  return payloadData.data
}

export async function downloadEmployeeUploadTemplate({
  apiUrl,
  accessToken,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/hr/employee/template/upload"), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (response.status === 403) {
    throw new Error("You do not have permission to download the employee template.")
  }

  if (!response.ok) {
    throw new Error("Unable to download the employee upload template right now.")
  }

  return response.blob()
}

export async function uploadEmployeeTemplate({
  apiUrl,
  accessToken,
  file,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  file: File
  organizationId?: string
}): Promise<EmployeeUploadReport> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/hr/employee/upload"), {
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
    throw new Error(extractErrorMessage(payload, "You do not have permission to upload employees."))
  }

  if (!response.ok) {
    const uploadReport = extractEmployeeUploadReport(payload)
    const message = extractErrorMessage(payload, "Employee upload could not be completed.")

    if (uploadReport) {
      throw new EmployeeUploadReportError(message, uploadReport)
    }

    throw new Error(message)
  }

  if (!isRecord(payload) || payload.success !== true) {
    throw new Error(extractErrorMessage(payload, "Unable to upload the employee template right now."))
  }

  const uploadReport = extractEmployeeUploadReport(payload.data)

  if (!uploadReport) {
    throw new Error("The employee upload completed without a summary.")
  }

  return uploadReport
}

export async function updateEmployee({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: EmployeeFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/employee/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({
      accessToken,
      organizationId,
      contentType: "application/json",
    }),
    body: JSON.stringify(buildEmployeePayload(payload)),
  })

  const payloadData = await readJsonResponse<EmployeeRecord>(response)
  if (!payloadData.data) {
    throw new Error("The employee was updated, but the updated record was not returned.")
  }

  return payloadData.data
}

export async function softDeleteEmployee({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/employee/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function restoreEmployee({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/employee/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function permanentlyDeleteEmployee({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/employee/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}
