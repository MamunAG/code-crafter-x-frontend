export type LoginResponse = {
  success: boolean
  message: string
  data?: {
    access_token?: string
    refresh_token?: string
    user?: {
      id?: string
      email?: string
      name?: string
      user_name?: string
      display_name?: string
      role?: string
    }
  }
}

export type LoggedInUser = {
  id?: string
  email?: string
  name?: string
  user_name?: string
  display_name?: string
  role?: string
}

