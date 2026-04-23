export type RegisterResponse = {
  success: boolean
  message: string
  data?: {
    id?: string
    name?: string
    email?: string
    phone_no?: string
    user_name?: string
  }
}

export type RegisterFormValues = {
  name: string
  email: string
  phone_no: string
  user_name: string
  password: string
  date_of_birth: string
  gender: string
  bio: string
}

export type GenderOption = {
  label: string
  value: string
}

export type GenderResponse = {
  success: boolean
  message: string
  data?: string[]
}
