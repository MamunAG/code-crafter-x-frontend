import type {
  ApiResponse,
  PaginatedResponse,
  StyleFilterValues,
  StyleFormValues,
  StyleRecord,
} from "./style.types"

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
    throw new Error(payload?.message || "You do not have permission to complete this style action.")
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Unable to complete the style request right now.")
  }

  return payload
}

function appendFilterParams(url: URL, filters: Partial<StyleFilterValues>) {
  const productType = filters.productType?.trim() ?? ""
  const buyerId = filters.buyerId?.trim() ?? ""
  const styleNo = filters.styleNo?.trim() ?? ""
  const styleName = filters.styleName?.trim() ?? ""
  const itemType = filters.itemType?.trim() ?? ""
  const currencyId = filters.currencyId?.trim() ?? ""
  const isActive = filters.isActive?.trim() ?? ""

  if (productType) url.searchParams.set("productType", productType)
  if (buyerId) url.searchParams.set("buyerId", buyerId)
  if (styleNo) url.searchParams.set("styleNo", styleNo)
  if (styleName) url.searchParams.set("styleName", styleName)
  if (itemType) url.searchParams.set("itemType", itemType)
  if (currencyId) url.searchParams.set("currencyId", currencyId)
  if (isActive) url.searchParams.set("isActive", isActive)
}

function optionalString(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function optionalNumber(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue ? Number(trimmedValue) : undefined
}

function requiredNumber(value: string) {
  return Number(value.trim())
}

function normalizeNumber(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue ? Number(trimmedValue) : 0
}

function buildStylePayload(payload: StyleFormValues) {
  return {
    productType: optionalString(payload.productType),
    buyerId: payload.buyerId.trim(),
    styleNo: payload.styleNo.trim(),
    styleName: optionalString(payload.styleName),
    itemType: optionalString(payload.itemType),
    productDepartment: optionalString(payload.productDepartment),
    cmSewing: normalizeNumber(payload.cmSewing),
    currencyId: requiredNumber(payload.currencyId),
    smvSewing: normalizeNumber(payload.smvSewing),
    smvSewingSideSeam: normalizeNumber(payload.smvSewingSideSeam),
    smvCutting: normalizeNumber(payload.smvCutting),
    smvCuttingSideSeam: normalizeNumber(payload.smvCuttingSideSeam),
    smvFinishing: normalizeNumber(payload.smvFinishing),
    imageId: optionalNumber(payload.imageId),
    remarks: optionalString(payload.remarks),
    isActive: payload.isActive,
    itemUom: optionalString(payload.itemUom),
    productFamily: optionalString(payload.productFamily),
    styleToColorMaps: payload.colors.map((item) => ({ colorId: Number(item.value) })),
    styleToSizeMaps: payload.sizes.map((item) => ({ sizeId: Number(item.value) })),
    styleToEmbellishmentMaps: payload.embellishments.map((item) => ({
      embellishmentId: Number(item.value),
    })),
  }
}

export async function fetchStyles({
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
  filters: Partial<StyleFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<StyleRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/style")
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

  const payload = await readJsonResponse<PaginatedResponse<StyleRecord>>(response)

  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The style list was returned without pagination data.")
  }

  return payload.data
}

export async function fetchStyle({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  organizationId?: string
}): Promise<StyleRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/style/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<StyleRecord>(response)

  if (!payload.data) {
    throw new Error("The style record was returned without data.")
  }

  return payload.data
}

export async function createStyle({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: StyleFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/style"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildStylePayload(payload)),
  })

  const payloadData = await readJsonResponse<StyleRecord>(response)

  if (!payloadData.data) {
    throw new Error("The style was saved, but the created record was not returned.")
  }

  return payloadData.data
}

export async function uploadStyleImageFile({
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

export async function downloadStyleUploadTemplate({
  apiUrl,
  accessToken,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/style/template/upload"), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (response.status === 403) {
    throw new Error("You do not have permission to download the style template.")
  }

  if (!response.ok) {
    throw new Error("Unable to download the style upload template right now.")
  }

  return response.blob()
}

export async function uploadStyleTemplate({
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

  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/style/upload"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    body: formData,
  })

  const payload = await readJsonResponse<{ inserted: number; skipped: number }>(response)

  if (!payload.data) {
    throw new Error("The style upload completed without a summary.")
  }

  return payload.data
}

export async function updateStyle({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: StyleFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/style/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildStylePayload(payload)),
  })

  const payloadData = await readJsonResponse<StyleRecord>(response)

  if (!payloadData.data) {
    throw new Error("The style was updated, but the updated record was not returned.")
  }

  return payloadData.data
}

export async function softDeleteStyle({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/style/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function restoreStyle({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/style/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function permanentlyDeleteStyle({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/style/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}
