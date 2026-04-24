import type {
  BackendFileResponse,
  BackendProfileResponse,
  BackendProfileUser,
  BackendUpdateResponse,
  ProfileUpdatePayload,
} from "./profile.types"

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

type UploadProfileFileRequest = {
  apiUrl: string
  accessToken: string
  file: File
}

export async function uploadProfileFile({
  apiUrl,
  accessToken,
  file,
}: UploadProfileFileRequest) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${apiUrl}/api/v1/files/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    body: formData,
  })

  let payload: BackendFileResponse | null = null

  try {
    payload = (await response.json()) as BackendFileResponse
  } catch {
    payload = null
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (response.status === 413) {
    throw new Error("Profile photo is too large. Please choose a smaller image.")
  }

  if (
    payload?.message?.toLowerCase().includes("file too large") ||
    payload?.message?.toLowerCase().includes("payload too large") ||
    payload?.message?.includes("LIMIT_FILE_SIZE")
  ) {
    throw new Error("Profile photo is too large. Please choose a smaller image.")
  }

  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(payload?.message || "Unable to save the uploaded file right now.")
  }

  return payload.data
}

type UpdateProfileRequest = {
  apiUrl: string
  accessToken: string
  userId: string
  payload: ProfileUpdatePayload
}

export async function updateProfile({
  apiUrl,
  accessToken,
  userId,
  payload,
}: UpdateProfileRequest) {
  const response = await fetch(`${apiUrl}/api/v1/users/${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  })

  let data: BackendUpdateResponse | null = null

  try {
    data = (await response.json()) as BackendUpdateResponse
  } catch {
    data = null
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || "Unable to save profile changes right now.")
  }

  return data
}
