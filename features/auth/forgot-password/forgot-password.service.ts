type ApiResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  timestamp?: string
}

async function readResponse<T>(response: Response, fallbackMessage: string) {
  let payload: ApiResponse<T> | null = null

  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || fallbackMessage)
  }

  return payload
}

export async function requestResetCode({
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

  return readResponse<{ expires_in_seconds?: number }>(
    response,
    "Unable to request a reset code right now.",
  )
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
    body: JSON.stringify({
      email: email.trim(),
      code: code.trim(),
    }),
  })

  return readResponse(response, "Unable to verify the reset code right now.")
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

  return readResponse(response, "Unable to reset the password right now.")
}
