export type BackendProfilePicture = {
  id?: number
  file_name?: string
  original_name?: string
  file_path?: string
  file_size?: number | string
  mime_type?: string
  public_url?: string
  file_url?: string
  thumbnail_url?: string
}

export type BackendProfileLocation = {
  city?: string
  state?: string
  country?: string
  area?: string
  latitude?: number
  longitude?: number
  created_at?: string
  updated_at?: string
}

export type BackendProfileUser = {
  id?: string
  name?: string
  display_name?: string
  user_name?: string
  email?: string
  phone_no?: string
  date_of_birth?: string
  gender?: string
  bio?: string
  role?: string
  status?: string
  is_email_verified?: boolean
  is_enable_notifications?: boolean
  last_seen_at?: string
  created_at?: string
  updated_at?: string
  deleted_at?: string
  created_by_id?: string
  updated_by_id?: string
  profile_pic?: BackendProfilePicture | null
  location?: BackendProfileLocation | null
  likes?: number
  faves?: number
  admieres?: number
  form?: number
}

export type BackendProfileResponse = {
  success: boolean
  message: string
  data?: BackendProfileUser
  timestamp?: string
}
