import { LOGIN_ROUTE } from "./login.constants"
import type { LoginResponse } from "./login.types"

type LoginRequest = {
  apiUrl: string
  email: string
  password: string
}

export async function loginUser({ apiUrl, email, password }: LoginRequest) {
  const response = await fetch(`${apiUrl}${LOGIN_ROUTE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  })

  const payload = (await response.json()) as LoginResponse

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Unable to login right now")
  }

  return payload
}

