import type { ApiResponse, MenuPermissionRecord, MenuPermissionValue } from "./menu-permission.types"

function buildApiUrl(apiUrl: string, path: string) {
  return new URL(path, apiUrl)
}

async function readJsonResponse<T>(
  response: Response,
  fallbackMessage = "Unable to complete the menu permission request right now.",
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

export async function fetchMenuPermissions({
  apiUrl,
  accessToken,
  organizationId,
  userId,
}: {
  apiUrl: string
  accessToken: string
  organizationId: string
  userId?: string
}): Promise<MenuPermissionRecord[]> {
  const url = buildApiUrl(apiUrl, "/api/v1/menu-permission")
  url.searchParams.set("organizationId", organizationId)

  if (userId) {
    url.searchParams.set("userId", userId)
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const responseData = await readJsonResponse<MenuPermissionRecord[]>(
    response,
    "Unable to load menu permissions right now.",
  )

  if (!Array.isArray(responseData.data)) {
    throw new Error("The menu permission list was returned without data.")
  }

  return responseData.data
}

export async function saveMenuPermissions({
  apiUrl,
  accessToken,
  organizationId,
  userId,
  permissions,
}: {
  apiUrl: string
  accessToken: string
  organizationId: string
  userId: string
  permissions: MenuPermissionValue[]
}): Promise<MenuPermissionRecord[]> {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/menu-permission"), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      organizationId,
      userId,
      permissions,
    }),
  })

  const responseData = await readJsonResponse<MenuPermissionRecord[]>(
    response,
    "Unable to save menu permissions right now.",
  )

  if (!Array.isArray(responseData.data)) {
    throw new Error("The menu permissions were saved, but the updated records were not returned.")
  }

  return responseData.data
}
