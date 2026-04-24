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

export type BackendFileRecord = {
  success?: boolean
  file_id: number
  file_url: string
  thumbnail_url?: string
  original_name: string
  file_name: string
  file_size: number
  mime_type: string
  file_type: string
  file_category: string
  message?: string
  public_url?: string
  uploaded_by?: string
  uploaded_at?: string
  updated_at?: string
  deleted_at?: string | null
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
  recovery_email?: string | null
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
  profile_pic_id?: number | null
  profile_pic?: BackendProfilePicture | null
  location?: BackendProfileLocation | null
  likes?: number
  faves?: number
  admieres?: number
  form?: number
}

export type ProfileUpdatePayload = {
  name: string
  user_name: string
  email: string
  phone_no: string
  date_of_birth?: string
  gender: string
  bio?: string
  role: string
  status: string
  profile_pic_id?: number | null
}

export type BackendProfileResponse = {
  success: boolean
  message: string
  data?: BackendProfileUser
  timestamp?: string
}

export type BackendFileResponse = {
  success: boolean
  message: string
  data?: BackendFileRecord
  timestamp?: string
}

export type BackendUpdateResponse = {
  success: boolean
  message: string
  data?: unknown
  timestamp?: string
}
