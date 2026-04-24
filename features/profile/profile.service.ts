import type { BackendProfileResponse, BackendProfileUser } from "./profile.types"

type FetchProfileRequest = {
  apiUrl: string
  userId: string
  accessToken: string
}

export async function fetchProfile({
  apiUrl,
  userId,
  accessToken,
}: FetchProfileRequest): Promise<BackendProfileUser> {
  const response = await fetch(`${apiUrl}/api/v1/users/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  let payload: BackendProfileResponse | null = null

  try {
    payload = (await response.json()) as BackendProfileResponse
  } catch {
    payload = null
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(payload?.message || "Unable to load your profile right now.")
  }

  return payload.data
}
