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

export async function requestConfirmEmailCode({
  apiUrl,
  email,
}: {
  apiUrl: string
  email: string
}) {
  const response = await fetch(`${apiUrl}/api/v1/auth/resend-confirm-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email: email.trim() }),
  })

  return readResponse<{ expires_in_seconds?: number }>(
    response,
    "Unable to request a confirmation code right now.",
  )
}

export async function confirmEmailCode({
  apiUrl,
  email,
  code,
}: {
  apiUrl: string
  email: string
  code: string
}) {
  const response = await fetch(`${apiUrl}/api/v1/auth/confirm-email`, {
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

  return readResponse(response, "Unable to verify the email right now.")
}
