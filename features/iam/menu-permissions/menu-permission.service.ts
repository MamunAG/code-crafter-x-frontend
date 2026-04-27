import type {
  ApiResponse,
  ManageableUserMappingRecord,
  MenuOrganizationMapRecord,
  MenuPermissionRecord,
  MenuPermissionValue,
} from "./menu-permission.types"

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

  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (response.status === 403) {
    throw new Error(payload?.message || "You do not have permission to manage menu access.")
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || fallbackMessage)
  }

  return payload
}

export async function fetchMenuPermissions({
  apiUrl,
  accessToken,
  userId,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  userId?: string
  organizationId?: string
}): Promise<MenuPermissionRecord[]> {
  const url = buildApiUrl(apiUrl, "/api/v1/menu-permission")

  if (userId) {
    url.searchParams.set("userId", userId)
  }

  if (organizationId) {
    url.searchParams.set("organizationId", organizationId)
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
  userId,
  organizationId,
  permissions,
}: {
  apiUrl: string
  accessToken: string
  userId: string
  organizationId: string
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
      userId,
      organizationId,
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

export async function fetchManageableUserMappings({
  apiUrl,
  accessToken,
}: {
  apiUrl: string
  accessToken: string
}): Promise<ManageableUserMappingRecord[]> {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/user-to-oranization-map/admin/users"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const responseData = await readJsonResponse<ManageableUserMappingRecord[]>(
    response,
    "Unable to load users from your admin organizations right now.",
  )

  if (!Array.isArray(responseData.data)) {
    throw new Error("The manageable user list was returned without data.")
  }

  return responseData.data
}

export async function fetchMenuOrganizationMaps({
  apiUrl,
  accessToken,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  organizationId: string
}): Promise<MenuOrganizationMapRecord[]> {
  const url = buildApiUrl(apiUrl, "/api/v1/menu-to-organization-map")
  url.searchParams.set("organizationId", organizationId)

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const responseData = await readJsonResponse<MenuOrganizationMapRecord[]>(
    response,
    "Unable to load organization menu mappings right now.",
  )

  if (!Array.isArray(responseData.data)) {
    throw new Error("The organization menu mapping list was returned without data.")
  }

  return responseData.data
}

export async function saveMenuOrganizationMaps({
  apiUrl,
  accessToken,
  organizationId,
  menuIds,
}: {
  apiUrl: string
  accessToken: string
  organizationId: string
  menuIds: string[]
}): Promise<MenuOrganizationMapRecord[]> {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/menu-to-organization-map"), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      organizationId,
      menuIds,
    }),
  })

  const responseData = await readJsonResponse<MenuOrganizationMapRecord[]>(
    response,
    "Unable to save organization menu mappings right now.",
  )

  if (!Array.isArray(responseData.data)) {
    throw new Error("The organization menu mappings were saved, but the updated records were not returned.")
  }

  return responseData.data
}
