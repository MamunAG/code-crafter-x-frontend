import type {
  ApiResponse,
  DepartmentFilterValues,
  DepartmentFormValues,
  DepartmentRecord,
  PaginatedResponse,
} from "./department.types"

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
  if (response.status === 403) throw new Error(payload?.message || "You do not have permission to complete this department action.")
  if (!response.ok || !payload?.success) throw new Error(payload?.message || "Unable to complete the department request right now.")

  return payload
}

function appendFilterParams(url: URL, filters: Partial<DepartmentFilterValues>) {
  if (filters.departmentName?.trim()) url.searchParams.set("departmentName", filters.departmentName.trim())
  if (filters.isActive?.trim()) url.searchParams.set("isActive", filters.isActive.trim())
}

function optionalString(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function buildDepartmentPayload(payload: DepartmentFormValues) {
  return {
    departmentName: payload.departmentName.trim(),
    description: optionalString(payload.description),
    isActive: payload.isActive,
  }
}

export async function fetchDepartments({
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
  filters: Partial<DepartmentFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<DepartmentRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/hr/department")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) url.searchParams.set("deletedOnly", "true")
  appendFilterParams(url, filters)

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<PaginatedResponse<DepartmentRecord>>(response)
  if (!payload.data?.items || !payload.data?.meta) throw new Error("The department list was returned without pagination data.")
  return payload.data
}

export async function fetchDepartment({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  organizationId?: string
}): Promise<DepartmentRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/department/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<DepartmentRecord>(response)
  if (!payload.data) throw new Error("The department record was returned without data.")
  return payload.data
}

export async function createDepartment({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: DepartmentFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/hr/department"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildDepartmentPayload(payload)),
  })

  const payloadData = await readJsonResponse<DepartmentRecord>(response)
  if (!payloadData.data) throw new Error("The department was saved, but the created record was not returned.")
  return payloadData.data
}

export async function downloadDepartmentUploadTemplate({
  apiUrl,
  accessToken,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/hr/department/template/upload"), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  if (response.status === 401) throw new Error("Your session expired. Please sign in again.")
  if (response.status === 403) throw new Error("You do not have permission to download the department template.")
  if (!response.ok) throw new Error("Unable to download the department upload template right now.")

  return response.blob()
}

export async function uploadDepartmentTemplate({
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

  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/hr/department/upload"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    body: formData,
  })

  const payload = await readJsonResponse<{ inserted: number; skipped: number }>(response)
  if (!payload.data) throw new Error("The department upload completed without a summary.")
  return payload.data
}

export async function updateDepartment({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: DepartmentFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/department/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildDepartmentPayload(payload)),
  })

  const payloadData = await readJsonResponse<DepartmentRecord>(response)
  if (!payloadData.data) throw new Error("The department was updated, but the updated record was not returned.")
  return payloadData.data
}

export async function softDeleteDepartment({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/department/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })
  await readJsonResponse(response)
}

export async function restoreDepartment({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/department/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })
  await readJsonResponse(response)
}

export async function permanentlyDeleteDepartment({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/hr/department/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })
  await readJsonResponse(response)
}
