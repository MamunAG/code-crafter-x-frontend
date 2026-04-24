import type {
  BackendProfileResponse,
  BackendProfileUser,
  BackendUpdateResponse,
} from "@/features/profile/profile.types"

type ApiResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  timestamp?: string
}

async function readResponse<T>(response: Response) {
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
    throw new Error(payload?.message || "Unable to update security settings right now.")
  }

  return payload
}

export async function updateRecoveryEmail({
  apiUrl,
  accessToken,
  userId,
  recoveryEmail,
}: {
  apiUrl: string
  accessToken: string
  userId: string
  recoveryEmail: string
}): Promise<BackendProfileUser> {
  const response = await fetch(`${apiUrl}/api/v1/users/${userId}/recovery-email`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      recovery_email: recoveryEmail.trim() || undefined,
    }),
  })

  const payload = await readResponse<BackendProfileUser>(response)

  if (!payload.data) {
    throw new Error("Recovery email was saved, but the updated account was not returned.")
  }

  return payload.data
}

export async function requestPasswordReset({
  apiUrl,
  email,
}: {
  apiUrl: string
  email: string
}) {
  const response = await fetch(`${apiUrl}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email: email.trim() }),
  })

  return readResponse(response)
}

export async function verifyResetCode({
  apiUrl,
  email,
  code,
}: {
  apiUrl: string
  email: string
  code: string
}) {
  const response = await fetch(`${apiUrl}/api/v1/auth/verify-reset-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email: email.trim(), code: code.trim() }),
  })

  return readResponse(response)
}

export async function resetPassword({
  apiUrl,
  email,
  code,
  newPassword,
  confirmPassword,
}: {
  apiUrl: string
  email: string
  code: string
  newPassword: string
  confirmPassword: string
}) {
  const response = await fetch(`${apiUrl}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: email.trim(),
      code: code.trim(),
      newPassword,
      confirmPassword,
    }),
  })

  return readResponse<BackendUpdateResponse>(response)
}

export type SecurityProfileResponse = BackendProfileResponse
