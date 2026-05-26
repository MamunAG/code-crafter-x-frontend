import type {
  ApiResponse,
  MaterialFilterValues,
  MaterialFormValues,
  MaterialRecord,
  PaginatedResponse,
} from "./material.types"
import { MATERIAL_IMAGE_TOO_LARGE_MESSAGE } from "./material.constants"

type BackendFileRecord = {
  id?: number
  file_id: number
  file_name?: string
  original_name?: string
  file_path?: string
  file_url?: string
  public_url?: string
  thumbnail_url?: string
  mime_type?: string
  uploaded_by?: string
  uploaded_at?: string
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
      payload?.message ||
        "You do not have permission to complete this material action."
    )
  }

  if (!response.ok || !payload?.success) {
    throw new Error(
      payload?.message || "Unable to complete the material request right now."
    )
  }

  return payload
}

type MaterialUploadMissingSetup = {
  units?: string[]
  materialGroups?: string[]
}

type MaterialUploadErrorReport = {
  missing?: MaterialUploadMissingSetup
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function extractResponseMessage(payload: unknown) {
  if (!isRecord(payload)) {
    return ""
  }

  const message = payload.message

  return typeof message === "string" ? message : ""
}

function findMaterialUploadReport(
  payload: unknown,
  depth = 0
): MaterialUploadErrorReport | undefined {
  if (!isRecord(payload) || depth > 3) {
    return undefined
  }

  if (isRecord(payload.uploadReport)) {
    return payload.uploadReport as MaterialUploadErrorReport
  }

  if (isRecord(payload.data)) {
    const directReport = findMaterialUploadReport(payload.data, depth + 1)
    if (directReport) {
      return directReport
    }
  }

  if (isRecord(payload.message)) {
    const nestedReport = findMaterialUploadReport(payload.message, depth + 1)
    if (nestedReport) {
      return nestedReport
    }
  }

  if (isRecord(payload.error)) {
    return findMaterialUploadReport(payload.error, depth + 1)
  }

  return undefined
}

function formatMissingSetupList(values?: string[]) {
  const items = [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))]

  if (!items.length) {
    return ""
  }

  return items.join(", ")
}

function buildMaterialUploadErrorMessage(
  fallbackMessage: string,
  report?: MaterialUploadErrorReport
) {
  const units = formatMissingSetupList(report?.missing?.units)
  const groups = formatMissingSetupList(report?.missing?.materialGroups)

  const parts: string[] = []

  if (units) {
    parts.push(`Units missing: ${units}.`)
  }

  if (groups) {
    parts.push(`Material groups missing: ${groups}.`)
  }

  if (!parts.length) {
    return fallbackMessage
  }

  return `${fallbackMessage} ${parts.join(" ")}`
}

function appendFilterParams(url: URL, filters: Partial<MaterialFilterValues>) {
  if (filters.name?.trim()) url.searchParams.set("name", filters.name.trim())
  if (filters.code?.trim()) url.searchParams.set("code", filters.code.trim())
  if (filters.description?.trim()) {
    url.searchParams.set("description", filters.description.trim())
  }
  if (filters.isActive?.trim()) {
    url.searchParams.set("isActive", filters.isActive.trim())
  }
}

function optionalString(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function optionalNumber(value: string) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return undefined

  const numericValue = Number.parseInt(trimmedValue, 10)
  return Number.isNaN(numericValue) ? undefined : numericValue
}

function buildMaterialPayload(payload: MaterialFormValues) {
  return {
    name: payload.name.trim(),
    code: optionalString(payload.code),
    description: optionalString(payload.description),
    unitId: optionalNumber(payload.unitId),
    materialGroupId: optionalString(payload.materialGroupId),
    imageId: optionalNumber(payload.imageId),
    isActive: payload.isActive,
  }
}

export async function fetchMaterials({
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
  filters: Partial<MaterialFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<MaterialRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/material")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) url.searchParams.set("deletedOnly", "true")
  appendFilterParams(url, filters)

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload =
    await readJsonResponse<PaginatedResponse<MaterialRecord>>(response)

  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The material list was returned without pagination data.")
  }

  return payload.data
}

export async function fetchMaterial({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  organizationId?: string
}): Promise<MaterialRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/material/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<MaterialRecord>(response)
  if (!payload.data) {
    throw new Error("The material record was returned without data.")
  }

  return payload.data
}

export async function createMaterial({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: MaterialFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/material"), {
    method: "POST",
    headers: buildRequestHeaders({
      accessToken,
      organizationId,
      contentType: "application/json",
    }),
    body: JSON.stringify(buildMaterialPayload(payload)),
  })

  const payloadData = await readJsonResponse<MaterialRecord>(response)
  if (!payloadData.data) {
    throw new Error(
      "The material was saved, but the created record was not returned."
    )
  }

  return payloadData.data
}

export async function updateMaterial({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: MaterialFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/material/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({
      accessToken,
      organizationId,
      contentType: "application/json",
    }),
    body: JSON.stringify(buildMaterialPayload(payload)),
  })

  const payloadData = await readJsonResponse<MaterialRecord>(response)
  if (!payloadData.data) {
    throw new Error(
      "The material was updated, but the updated record was not returned."
    )
  }

  return payloadData.data
}

export async function uploadMaterialImageFile({
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

  const response = await fetch(`${apiUrl}/api/v1/files/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    body: formData,
  })

  let payload: { success?: boolean; message?: string; data?: BackendFileRecord } | null = null

  try {
    payload = (await response.json()) as { success?: boolean; message?: string; data?: BackendFileRecord }
  } catch {
    payload = null
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (response.status === 413) {
    throw new Error(MATERIAL_IMAGE_TOO_LARGE_MESSAGE)
  }

  if (
    payload?.message?.toLowerCase().includes("file too large") ||
    payload?.message?.toLowerCase().includes("payload too large") ||
    payload?.message?.includes("LIMIT_FILE_SIZE")
  ) {
    throw new Error(MATERIAL_IMAGE_TOO_LARGE_MESSAGE)
  }

  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(payload?.message || "Unable to save the uploaded image right now.")
  }

  return payload.data
}

export async function downloadMaterialUploadTemplate({
  apiUrl,
  accessToken,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
}) {
  const response = await fetch(
    buildApiUrl(apiUrl, "/api/v1/material/template/upload"),
    {
      method: "GET",
      headers: buildRequestHeaders({ accessToken, organizationId }),
    }
  )

  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (response.status === 403) {
    throw new Error("You do not have permission to download the material template.")
  }

  if (!response.ok) {
    throw new Error("Unable to download the material upload template right now.")
  }

  return response.blob()
}

export async function uploadMaterialTemplate({
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

  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/material/upload"), {
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
    throw new Error(
      extractResponseMessage(payload) ||
        "You do not have permission to upload materials."
    )
  }

  const uploadReport = findMaterialUploadReport(payload)

  const successPayload = isRecord(payload) ? (payload as ApiResponse<{ inserted: number; skipped: number }>) : null

  if (!response.ok || !successPayload?.success) {
    const message = extractResponseMessage(payload) || "Unable to upload the material template right now."

    throw new Error(buildMaterialUploadErrorMessage(message, uploadReport))
  }

  if (!successPayload.data) {
    throw new Error("The material upload completed without a summary.")
  }

  return successPayload.data
}

export async function softDeleteMaterial({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/material/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function restoreMaterial({
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
  const response = await fetch(
    buildApiUrl(apiUrl, `/api/v1/material/${id}/restore`),
    {
      method: "POST",
      headers: buildRequestHeaders({ accessToken, organizationId }),
    }
  )

  await readJsonResponse(response)
}

export async function permanentlyDeleteMaterial({
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
  const response = await fetch(
    buildApiUrl(apiUrl, `/api/v1/material/${id}/permanent`),
    {
      method: "DELETE",
      headers: buildRequestHeaders({ accessToken, organizationId }),
    }
  )

  await readJsonResponse(response)
}
