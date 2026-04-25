import type { ApiResponse, OrganizationFormValues, OrganizationRecord } from "./organization.types"

function buildApiUrl(apiUrl: string, path: string) {
  return new URL(path, apiUrl)
}

async function readJsonResponse<T>(response: Response) {
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
    throw new Error(payload?.message || "Unable to complete the organization request right now.")
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
      address: payload.address.trim(),
      contact: payload.contact.trim(),
    }),
  })

  const responseData = await readJsonResponse<OrganizationRecord>(response)

  if (!responseData.data) {
    throw new Error("The organization was saved, but the created record was not returned.")
  }

  return responseData.data
}
