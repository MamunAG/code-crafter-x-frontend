export type LoginResponse = {
  success: boolean
  message: string
  data?: {
    access_token?: string
    refresh_token?: string
    user?: {
      id?: string
      email?: string
      recovery_email?: string | null
      name?: string
      user_name?: string
      display_name?: string
      role?: string
      avatar?: string
      avatar_url?: string
      image?: string
      image_url?: string
      picture?: string
      photo_url?: string
      profile_image?: string
      profile_image_url?: string
      profile_pic?: {
        public_url?: string
        file_url?: string
        thumbnail_url?: string
      } | null
    }
  }
}

export type LoggedInUser = {
  id?: string
  email?: string
  recovery_email?: string | null
  name?: string
  user_name?: string
  display_name?: string
  role?: string
  avatar?: string
  avatar_url?: string
  image?: string
  image_url?: string
  picture?: string
  photo_url?: string
  profile_image?: string
  profile_image_url?: string
  profile_pic?: {
    public_url?: string
    file_url?: string
    thumbnail_url?: string
  } | null
}
