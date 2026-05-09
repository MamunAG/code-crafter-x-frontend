import type {
  ApiResponse,
  PaginatedResponse,
  SupplierFilterValues,
  SupplierFormValues,
  SupplierRecord,
} from "./supplier.types"

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
        "You do not have permission to complete this supplier action."
    )
  }

  if (!response.ok || !payload?.success) {
    throw new Error(
      payload?.message || "Unable to complete the supplier request right now."
    )
  }

  return payload
}

function appendFilterParams(url: URL, filters: Partial<SupplierFilterValues>) {
  if (filters.name?.trim()) url.searchParams.set("name", filters.name.trim())
  if (filters.code?.trim()) url.searchParams.set("code", filters.code.trim())
  if (filters.contact?.trim())
    url.searchParams.set("contact", filters.contact.trim())
  if (filters.email?.trim()) url.searchParams.set("email", filters.email.trim())
  if (filters.address?.trim())
    url.searchParams.set("address", filters.address.trim())
  if (filters.isActive?.trim())
    url.searchParams.set("isActive", filters.isActive.trim())
}

function optionalString(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function buildSupplierPayload(payload: SupplierFormValues) {
  return {
    name: payload.name.trim(),
    code: optionalString(payload.code),
    contact: optionalString(payload.contact),
    email: optionalString(payload.email),
    address: optionalString(payload.address),
    remarks: optionalString(payload.remarks),
    isActive: payload.isActive,
  }
}

export async function fetchSuppliers({
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
  filters: Partial<SupplierFilterValues>
  deletedOnly?: boolean
  organizationId?: string
}): Promise<PaginatedResponse<SupplierRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/supplier")
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
    await readJsonResponse<PaginatedResponse<SupplierRecord>>(response)

  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The supplier list was returned without pagination data.")
  }

  return payload.data
}

export async function fetchSupplier({
  apiUrl,
  accessToken,
  id,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  organizationId?: string
}): Promise<SupplierRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/supplier/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<SupplierRecord>(response)

  if (!payload.data) {
    throw new Error("The supplier record was returned without data.")
  }

  return payload.data
}

export async function createSupplier({
  apiUrl,
  accessToken,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  payload: SupplierFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/supplier"), {
    method: "POST",
    headers: buildRequestHeaders({
      accessToken,
      organizationId,
      contentType: "application/json",
    }),
    body: JSON.stringify(buildSupplierPayload(payload)),
  })

  const payloadData = await readJsonResponse<SupplierRecord>(response)

  if (!payloadData.data) {
    throw new Error(
      "The supplier was saved, but the created record was not returned."
    )
  }

  return payloadData.data
}

export async function downloadSupplierUploadTemplate({
  apiUrl,
  accessToken,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
}) {
  const response = await fetch(
    buildApiUrl(apiUrl, "/api/v1/supplier/template/upload"),
    {
      method: "GET",
      headers: buildRequestHeaders({ accessToken, organizationId }),
    }
  )

  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (response.status === 403) {
    throw new Error("You do not have permission to download the supplier template.")
  }

  if (!response.ok) {
    throw new Error("Unable to download the supplier upload template right now.")
  }

  return response.blob()
}

export async function uploadSupplierTemplate({
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

  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/supplier/upload"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    body: formData,
  })

  const payload = await readJsonResponse<{ inserted: number; skipped: number }>(
    response
  )

  if (!payload.data) {
    throw new Error("The supplier upload completed without a summary.")
  }

  return payload.data
}

export async function updateSupplier({
  apiUrl,
  accessToken,
  id,
  payload,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: SupplierFormValues
  organizationId?: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/supplier/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({
      accessToken,
      organizationId,
      contentType: "application/json",
    }),
    body: JSON.stringify(buildSupplierPayload(payload)),
  })

  const payloadData = await readJsonResponse<SupplierRecord>(response)

  if (!payloadData.data) {
    throw new Error(
      "The supplier was updated, but the updated record was not returned."
    )
  }

  return payloadData.data
}

export async function softDeleteSupplier({
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
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/supplier/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function restoreSupplier({
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
    buildApiUrl(apiUrl, `/api/v1/supplier/${id}/restore`),
    {
      method: "POST",
      headers: buildRequestHeaders({ accessToken, organizationId }),
    }
  )

  await readJsonResponse(response)
}

export async function permanentlyDeleteSupplier({
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
    buildApiUrl(apiUrl, `/api/v1/supplier/${id}/permanent`),
    {
      method: "DELETE",
      headers: buildRequestHeaders({ accessToken, organizationId }),
    }
  )

  await readJsonResponse(response)
}
