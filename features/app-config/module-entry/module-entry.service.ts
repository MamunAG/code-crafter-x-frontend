import type {
  ApiResponse,
  ModuleEntryFilterValues,
  ModuleEntryFormValues,
  ModuleEntryRecord,
  PaginatedResponse,
} from "./module-entry.types"

function buildApiUrl(apiUrl: string, path: string) {
  return new URL(path, apiUrl)
}

async function readJsonResponse<T>(
  response: Response,
  fallbackMessage = "Unable to complete the module entry request right now.",
) {
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
    throw new Error(payload?.message || "You do not have permission to manage module entries.")
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || fallbackMessage)
  }

  return payload
}

export async function fetchModuleEntries({
  apiUrl,
  accessToken,
  filters,
  page = 1,
  limit = 20,
}: {
  apiUrl: string
  accessToken: string
  filters?: Partial<ModuleEntryFilterValues>
  page?: number
  limit?: number
}): Promise<PaginatedResponse<ModuleEntryRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/module-entry")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))

  if (filters?.moduleName?.trim()) {
    url.searchParams.set("moduleName", filters.moduleName.trim())
  }

  if (filters?.moduleKey?.trim()) {
    url.searchParams.set("moduleKey", filters.moduleKey.trim())
  }

  if (filters?.isActive && filters.isActive !== "all") {
    url.searchParams.set("isActive", filters.isActive === "active" ? "true" : "false")
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const responseData = await readJsonResponse<PaginatedResponse<ModuleEntryRecord>>(
    response,
    "Unable to load module entries right now.",
  )

  if (!responseData.data) {
    throw new Error("The module entry list was returned without data.")
  }

  return responseData.data
}

export async function createModuleEntry({
  apiUrl,
  accessToken,
  payload,
}: {
  apiUrl: string
  accessToken: string
  payload: ModuleEntryFormValues
}): Promise<ModuleEntryRecord> {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/module-entry"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(normalizePayload(payload)),
  })

  const responseData = await readJsonResponse<ModuleEntryRecord>(
    response,
    "Unable to save the module entry right now.",
  )

  if (!responseData.data) {
    throw new Error("The module entry was saved, but the created record was not returned.")
  }

  return responseData.data
}

export async function updateModuleEntry({
  apiUrl,
  accessToken,
  id,
  payload,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: ModuleEntryFormValues
}): Promise<ModuleEntryRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/module-entry/${id}`), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(normalizePayload(payload)),
  })

  const responseData = await readJsonResponse<ModuleEntryRecord>(
    response,
    "Unable to update the module entry right now.",
  )

  if (!responseData.data) {
    throw new Error("The module entry was updated, but the updated record was not returned.")
  }

  return responseData.data
}

export async function deleteModuleEntry({
  apiUrl,
  accessToken,
  id,
}: {
  apiUrl: string
  accessToken: string
  id: string
}): Promise<void> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/module-entry/${id}`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  await readJsonResponse(response, "Unable to delete the module entry right now.")
}

function normalizePayload(payload: ModuleEntryFormValues) {
  return {
    moduleName: payload.moduleName.trim(),
    moduleKey: payload.moduleKey.trim(),
    description: payload.description.trim() || undefined,
    displayOrder: Number(payload.displayOrder) || 0,
    isActive: payload.isActive,
  }
}
