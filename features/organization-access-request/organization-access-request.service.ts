import type {
  ApiResponse,
  OrganizationMembershipRecord,
  OrganizationRecord,
} from "@/features/organization/organization.types"

import type {
  OrganizationAccessRequestAssignment,
  OrganizationAccessRequestFormValues,
  OrganizationAccessRequestRecord,
} from "./organization-access-request.types"

function buildApiUrl(apiUrl: string, path: string) {
  return new URL(path, apiUrl)
}

async function readJsonResponse<T>(
  response: Response,
  fallbackMessage = "Unable to complete the organization access request right now.",
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

export async function createOrganizationAccessRequest({
  apiUrl,
  accessToken,
  payload,
}: {
  apiUrl: string
  accessToken: string
  payload: OrganizationAccessRequestFormValues
}): Promise<OrganizationAccessRequestRecord> {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/organization-access-requests"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      adminEmail: payload.adminEmail.trim(),
      message: payload.message.trim() || undefined,
    }),
  })

  const responseData = await readJsonResponse<OrganizationAccessRequestRecord>(response)

  if (!responseData.data) {
    throw new Error("The access request was saved, but the created record was not returned.")
  }

  return responseData.data
}

export async function fetchPendingOrganizationAccessRequests({
  apiUrl,
  accessToken,
}: {
  apiUrl: string
  accessToken: string
}): Promise<OrganizationAccessRequestRecord[]> {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/organization-access-requests/pending"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const responseData = await readJsonResponse<OrganizationAccessRequestRecord[]>(
    response,
    "Unable to load pending access requests right now.",
  )

  if (!Array.isArray(responseData.data)) {
    throw new Error("The pending access request list was returned without data.")
  }

  return responseData.data
}

export async function approveOrganizationAccessRequest({
  apiUrl,
  accessToken,
  requestId,
  assignments,
}: {
  apiUrl: string
  accessToken: string
  requestId: string
  assignments: OrganizationAccessRequestAssignment[]
}): Promise<OrganizationAccessRequestRecord> {
  const response = await fetch(
    buildApiUrl(apiUrl, `/api/v1/organization-access-requests/${requestId}/approve`),
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ assignments }),
    },
  )

  const responseData = await readJsonResponse<OrganizationAccessRequestRecord>(response)

  if (!responseData.data) {
    throw new Error("The request was approved, but the updated record was not returned.")
  }

  return responseData.data
}

export async function rejectOrganizationAccessRequest({
  apiUrl,
  accessToken,
  requestId,
  reviewNote,
}: {
  apiUrl: string
  accessToken: string
  requestId: string
  reviewNote?: string
}): Promise<OrganizationAccessRequestRecord> {
  const response = await fetch(
    buildApiUrl(apiUrl, `/api/v1/organization-access-requests/${requestId}/reject`),
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        reviewNote: reviewNote?.trim() || undefined,
      }),
    },
  )

  const responseData = await readJsonResponse<OrganizationAccessRequestRecord>(response)

  if (!responseData.data) {
    throw new Error("The request was rejected, but the updated record was not returned.")
  }

  return responseData.data
}

export async function fetchAccessibleOrganizations({
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

export async function fetchAdminOrganizationMemberships({
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
