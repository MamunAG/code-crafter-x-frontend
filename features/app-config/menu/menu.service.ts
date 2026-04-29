import type {
  ApiResponse,
  MenuFilterValues,
  MenuFormValues,
  MenuRecord,
  PaginatedResponse,
} from "./menu.types"

function buildApiUrl(apiUrl: string, path: string) {
  return new URL(path, apiUrl)
}

async function readJsonResponse<T>(
  response: Response,
  fallbackMessage = "Unable to complete the menu request right now.",
) {
  let payload: ApiResponse<T> | null = null

  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || fallbackMessage)
  }

  return payload
}

export async function fetchMenus({
  apiUrl,
  accessToken,
  filters,
  page = 1,
  limit = 20,
  deletedOnly = false,
}: {
  apiUrl: string
  accessToken: string
  filters?: Partial<MenuFilterValues>
  page?: number
  limit?: number
  deletedOnly?: boolean
}): Promise<PaginatedResponse<MenuRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/menu")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) {
    url.searchParams.set("deletedOnly", "true")
  }

  if (filters?.menuName?.trim()) {
    url.searchParams.set("menuName", filters.menuName.trim())
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

  const responseData = await readJsonResponse<PaginatedResponse<MenuRecord>>(
    response,
    "Unable to load menu entries right now.",
  )

  if (!responseData.data) {
    throw new Error("The menu list was returned without data.")
  }

  return responseData.data
}

export async function createMenu({
  apiUrl,
  accessToken,
  payload,
}: {
  apiUrl: string
  accessToken: string
  payload: MenuFormValues
}): Promise<MenuRecord> {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/menu"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(normalizePayload(payload)),
  })

  const responseData = await readJsonResponse<MenuRecord>(response, "Unable to save the menu entry right now.")

  if (!responseData.data) {
    throw new Error("The menu entry was saved, but the created record was not returned.")
  }

  return responseData.data
}

export async function updateMenu({
  apiUrl,
  accessToken,
  id,
  payload,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: MenuFormValues
}): Promise<MenuRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/menu/${id}`), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(normalizePayload(payload)),
  })

  const responseData = await readJsonResponse<MenuRecord>(response, "Unable to update the menu entry right now.")

  if (!responseData.data) {
    throw new Error("The menu entry was updated, but the updated record was not returned.")
  }

  return responseData.data
}

export async function deleteMenu({
  apiUrl,
  accessToken,
  id,
}: {
  apiUrl: string
  accessToken: string
  id: string
}): Promise<void> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/menu/${id}`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  await readJsonResponse(response, "Unable to delete the menu entry right now.")
}

export async function restoreMenu({
  apiUrl,
  accessToken,
  id,
}: {
  apiUrl: string
  accessToken: string
  id: string
}): Promise<void> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/menu/${id}/restore`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  await readJsonResponse(response, "Unable to restore the menu entry right now.")
}

export async function permanentlyDeleteMenu({
  apiUrl,
  accessToken,
  id,
}: {
  apiUrl: string
  accessToken: string
  id: string
}): Promise<void> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/menu/${id}/permanent`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  await readJsonResponse(response, "Unable to delete the menu entry right now.")
}

function normalizePayload(payload: MenuFormValues) {
  return {
    menuName: payload.menuName.trim(),
    moduleId: payload.moduleId,
    description: payload.description.trim() || undefined,
    displayOrder: Number(payload.displayOrder) || 0,
    isActive: payload.isActive,
  }
}
