import {
  DEFAULT_GENDER_OPTIONS,
  GENDER_OPTIONS_ROUTE,
  REGISTER_ROUTE,
} from "./register.constants"
import type {
  GenderOption,
  GenderResponse,
  RegisterResponse,
  RegisterFormValues,
} from "./register.types"

type RegisterRequest = {
  apiUrl: string
  values: RegisterFormValues
}

export async function registerUser({ apiUrl, values }: RegisterRequest) {
  const response = await fetch(`${apiUrl}${REGISTER_ROUTE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: values.name,
      email: values.email,
      phone_no: values.phone_no,
      date_of_birth: values.date_of_birth || undefined,
      gender: values.gender || undefined,
      user_name: values.user_name,
      password: values.password,
      bio: values.bio || undefined,
      role: "user",
    }),
  })

  const payload = (await response.json()) as RegisterResponse

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Unable to register right now")
  }

  return payload
}

export async function fetchGenderOptions(
  apiUrl: string,
): Promise<GenderOption[]> {
  const response = await fetch(`${apiUrl}${GENDER_OPTIONS_ROUTE}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as GenderResponse

  if (!response.ok || !payload.success) {
    return DEFAULT_GENDER_OPTIONS
  }

  const options = (payload.data ?? []).map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
  }))

  return options.length > 0 ? options : DEFAULT_GENDER_OPTIONS
}
