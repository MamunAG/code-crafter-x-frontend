import type {
  ApiResponse,
  OrganizationFormValues,
  OrganizationMemberUserRecord,
  OrganizationMembershipRecord,
  OrganizationRecord,
} from "./organization.types"

function buildApiUrl(apiUrl: string, path: string) {
  return new URL(path, apiUrl)
}

async function readJsonResponse<T>(
  response: Response,
  fallbackMessage = "Unable to complete the organization request right now.",
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

export async function createOrganization({
  apiUrl,
  accessToken,
  payload,
}: {
  apiUrl: string
  accessToken: string
  payload: OrganizationFormValues
}): Promise<OrganizationRecord> {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/organization"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name: payload.name.trim(),
      address: payload.address.trim() || undefined,
      contact: payload.contact.trim() || undefined,
      isDefault: payload.isDefault,
    }),
  })

  const responseData = await readJsonResponse<OrganizationRecord>(response)

  if (!responseData.data) {
    throw new Error("The organization was saved, but the created record was not returned.")
  }

  return responseData.data
}

export async function updateOrganization({
  apiUrl,
  accessToken,
  id,
  payload,
}: {
  apiUrl: string
  accessToken: string
  id: string
  payload: OrganizationFormValues
}): Promise<OrganizationRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/organization/${id}`), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name: payload.name.trim(),
      address: payload.address.trim() || undefined,
      contact: payload.contact.trim() || undefined,
    }),
  })

  const responseData = await readJsonResponse<OrganizationRecord>(response)

  if (!responseData.data) {
    throw new Error("The organization was updated, but the updated record was not returned.")
  }

  return responseData.data
}

export async function updateOrganizationDefault({
  apiUrl,
  accessToken,
  userId,
  organizationId,
  isDefault,
}: {
  apiUrl: string
  accessToken: string
  userId: string
  organizationId: string
  isDefault: boolean
}): Promise<void> {
  const response = await fetch(
    buildApiUrl(
      apiUrl,
      `/api/v1/user-to-oranization-map/mapping/${userId}/${organizationId}/default`,
    ),
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ isDefault }),
    },
  )

  await readJsonResponse(response)
}

export async function fetchUserOrganizations({
  apiUrl,
  accessToken,
  userId,
}: {
  apiUrl: string
  accessToken: string
  userId: string
}): Promise<OrganizationRecord[]> {
  const response = await fetch(
    buildApiUrl(apiUrl, `/api/v1/user-to-oranization-map/user/${userId}/organizations`),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  )

  const responseData = await readJsonResponse<OrganizationRecord[]>(
    response,
    "Unable to load organizations right now.",
  )

  if (!Array.isArray(responseData.data)) {
    throw new Error("The organization list was returned without data.")
  }

  return responseData.data
}

export async function fetchOrganizations({
  apiUrl,
  accessToken,
}: {
  apiUrl: string
  accessToken: string
}): Promise<OrganizationRecord[]> {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/organization"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const responseData = await readJsonResponse<OrganizationRecord[]>(
    response,
    "Unable to load organizations right now.",
  )

  if (!Array.isArray(responseData.data)) {
    throw new Error("The organization list was returned without data.")
  }

  return responseData.data
}

export async function fetchUserOrganizationMappings({
  apiUrl,
  accessToken,
  userId,
}: {
  apiUrl: string
  accessToken: string
  userId: string
}): Promise<OrganizationMembershipRecord[]> {
  const response = await fetch(
    buildApiUrl(apiUrl, `/api/v1/user-to-oranization-map/user/${userId}/mappings`),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  )

  const responseData = await readJsonResponse<OrganizationMembershipRecord[]>(
    response,
    "Unable to load organization memberships right now.",
  )

  if (!Array.isArray(responseData.data)) {
    throw new Error("The organization membership list was returned without data.")
  }

  return responseData.data
}

export async function fetchOrganizationMemberships({
  apiUrl,
  accessToken,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  organizationId: string
}): Promise<OrganizationMembershipRecord[]> {
  const response = await fetch(
    buildApiUrl(apiUrl, `/api/v1/user-to-oranization-map/organization/${organizationId}/mappings`),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  )

  const responseData = await readJsonResponse<OrganizationMembershipRecord[]>(
    response,
    "Unable to load organization members right now.",
  )

  if (!Array.isArray(responseData.data)) {
    throw new Error("The organization member list was returned without data.")
  }

  return responseData.data
}

export async function revokeOrganizationAccess({
  apiUrl,
  accessToken,
  userId,
  organizationId,
}: {
  apiUrl: string
  accessToken: string
  userId: string
  organizationId: string
}): Promise<void> {
  const response = await fetch(
    buildApiUrl(apiUrl, `/api/v1/user-to-oranization-map/mapping/${userId}/${organizationId}`),
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  )

  await readJsonResponse<OrganizationMemberUserRecord>(response, "Unable to revoke organization access right now.")
}

export async function updateOrganizationMemberRole({
  apiUrl,
  accessToken,
  userId,
  organizationId,
  role,
}: {
  apiUrl: string
  accessToken: string
  userId: string
  organizationId: string
  role: "admin" | "user"
}): Promise<OrganizationMembershipRecord> {
  const response = await fetch(
    buildApiUrl(apiUrl, `/api/v1/user-to-oranization-map/mapping/${userId}/${organizationId}/role`),
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ role }),
    },
  )

  const responseData = await readJsonResponse<OrganizationMembershipRecord>(
    response,
    "Unable to update the member role right now.",
  )

  if (!responseData.data) {
    throw new Error("The organization role was updated, but the updated membership was not returned.")
  }

  return responseData.data
}
