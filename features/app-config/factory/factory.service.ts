import type {
    ApiResponse,
    FactoryFilterValues,
    FactoryFormValues,
    FactoryRecord,
    PaginatedResponse,
} from "./factory.types"

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
        throw new Error(payload?.message || "You do not have permission to complete this factory action.")
    }

    if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Unable to complete the factory request right now.")
    }

    return payload
}

function appendFilterParams(url: URL, filters: Partial<FactoryFilterValues>) {
    if (filters.name?.trim()) url.searchParams.set("name", filters.name.trim())
    if (filters.displayName?.trim()) url.searchParams.set("displayName", filters.displayName.trim())
    if (filters.code?.trim()) url.searchParams.set("code", filters.code.trim())
    if (filters.contact?.trim()) url.searchParams.set("contact", filters.contact.trim())
    if (filters.email?.trim()) url.searchParams.set("email", filters.email.trim())
    if (filters.address?.trim()) url.searchParams.set("address", filters.address.trim())
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

function buildFactoryPayload(payload: FactoryFormValues) {
    return {
        name: payload.name.trim(),
        displayName: payload.displayName.trim(),
        code: optionalString(payload.code),
        contact: optionalString(payload.contact),
        email: optionalString(payload.email),
        imageId: optionalNumber(payload.imageId),
        address: optionalString(payload.address),
        remarks: optionalString(payload.remarks),
        isActive: payload.isActive,
    }
}

export async function fetchFactories({
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
    filters: Partial<FactoryFilterValues>
    deletedOnly?: boolean
    organizationId?: string
}): Promise<PaginatedResponse<FactoryRecord>> {
    const url = buildApiUrl(apiUrl, "/api/v1/factory")
    url.searchParams.set("page", String(page))
    url.searchParams.set("limit", String(limit))

    if (deletedOnly) url.searchParams.set("deletedOnly", "true")
    appendFilterParams(url, filters)

    const response = await fetch(url, {
        method: "GET",
        headers: buildRequestHeaders({ accessToken, organizationId }),
        cache: "no-store",
    })

    const payload = await readJsonResponse<PaginatedResponse<FactoryRecord>>(response)

    if (!payload.data?.items || !payload.data?.meta) {
        throw new Error("The factory list was returned without pagination data.")
    }

    return payload.data
}

export async function fetchFactory({
    apiUrl,
    accessToken,
    id,
    organizationId,
}: {
    apiUrl: string
    accessToken: string
    id: string
    organizationId?: string
}): Promise<FactoryRecord> {
    const response = await fetch(buildApiUrl(apiUrl, `/api/v1/factory/${id}`), {
        method: "GET",
        headers: buildRequestHeaders({ accessToken, organizationId }),
        cache: "no-store",
    })

    const payload = await readJsonResponse<FactoryRecord>(response)

    if (!payload.data) throw new Error("The factory record was returned without data.")

    return payload.data
}

export async function createFactory({
    apiUrl,
    accessToken,
    payload,
    organizationId,
}: {
    apiUrl: string
    accessToken: string
    payload: FactoryFormValues
    organizationId?: string
}) {
    const response = await fetch(buildApiUrl(apiUrl, "/api/v1/factory"), {
        method: "POST",
        headers: buildRequestHeaders({
            accessToken,
            organizationId,
            contentType: "application/json",
        }),
        body: JSON.stringify(buildFactoryPayload(payload)),
    })

    const payloadData = await readJsonResponse<FactoryRecord>(response)

    if (!payloadData.data) {
        throw new Error("The factory was saved, but the created record was not returned.")
    }

    return payloadData.data
}

export async function uploadFactoryImageFile({
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

    const payload = await readJsonResponse<BackendFileRecord>(response)

    if (!payload.data) {
        throw new Error("The uploaded image was saved, but no file record was returned.")
    }

    return payload.data
}

export async function updateFactory({
    apiUrl,
    accessToken,
    id,
    payload,
    organizationId,
}: {
    apiUrl: string
    accessToken: string
    id: string
    payload: FactoryFormValues
    organizationId?: string
}) {
    const response = await fetch(buildApiUrl(apiUrl, `/api/v1/factory/${id}`), {
        method: "PATCH",
        headers: buildRequestHeaders({
            accessToken,
            organizationId,
            contentType: "application/json",
        }),
        body: JSON.stringify(buildFactoryPayload(payload)),
    })

    const payloadData = await readJsonResponse<FactoryRecord>(response)

    if (!payloadData.data) {
        throw new Error("The factory was updated, but the updated record was not returned.")
    }

    return payloadData.data
}

export async function softDeleteFactory({
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
    const response = await fetch(buildApiUrl(apiUrl, `/api/v1/factory/${id}`), {
        method: "DELETE",
        headers: buildRequestHeaders({ accessToken, organizationId }),
    })

    await readJsonResponse(response)
}

export async function restoreFactory({
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
    const response = await fetch(buildApiUrl(apiUrl, `/api/v1/factory/${id}/restore`), {
        method: "POST",
        headers: buildRequestHeaders({ accessToken, organizationId }),
    })

    await readJsonResponse(response)
}

export async function permanentlyDeleteFactory({
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
    const response = await fetch(buildApiUrl(apiUrl, `/api/v1/factory/${id}/permanent`), {
        method: "DELETE",
        headers: buildRequestHeaders({ accessToken, organizationId }),
    })

    await readJsonResponse(response)
}

export async function downloadFactoryTemplate({
    apiUrl,
    accessToken,
    organizationId,
}: {
    apiUrl: string
    accessToken: string
    organizationId?: string
}) {
    const response = await fetch(buildApiUrl(apiUrl, "/api/v1/factory/template/upload"), {
        method: "GET",
        headers: buildRequestHeaders({ accessToken, organizationId }),
    })

    if (!response.ok) {
        throw new Error("Unable to download factory template.")
    }

    return response.blob()
}

export async function uploadFactoryTemplate({
    apiUrl,
    accessToken,
    file,
    organizationId,
}: {
    apiUrl: string
    accessToken: string
    file: File
    organizationId?: string
}) {
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch(buildApiUrl(apiUrl, "/api/v1/factory/upload"), {
        method: "POST",
        headers: buildRequestHeaders({ accessToken, organizationId }),
        body: formData,
    })

    return readJsonResponse(response)
}
