export type AuthUser = {
  id?: string
  email?: string
  name?: string
  user_name?: string
  display_name?: string
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

export const AUTH_COOKIE_NAME = "auth_session"
export const AUTH_USER_LABEL_COOKIE_NAME = "auth_user_label"
export const AUTH_USER_AVATAR_COOKIE_NAME = "auth_user_avatar"
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function getAuthUserLabel(user: AuthUser | null | undefined, fallback = "User") {
  if (!user) {
    return fallback
  }

  return (
    user.display_name ||
    user.name ||
    user.user_name ||
    user.email ||
    fallback
  )
}

export function getAuthUserImageUrl(user: AuthUser | null | undefined) {
  if (!user) {
    return ""
  }

  return (
    user.avatar ||
    user.avatar_url ||
    user.image ||
    user.image_url ||
    user.picture ||
    user.photo_url ||
    user.profile_image ||
    user.profile_image_url ||
    user.profile_pic?.public_url ||
    user.profile_pic?.file_url ||
    user.profile_pic?.thumbnail_url ||
    ""
  )
}

export function getAuthInitials(label: string) {
  const parts = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return "U"
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }

  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
}

export function parseStoredAuthUser(rawUser: string | null) {
  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser) as AuthUser
  } catch {
    return null
  }
}

export function serializeAuthSessionCookie() {
  return `${AUTH_COOKIE_NAME}=1; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; samesite=lax`
}

export function serializeAuthUserLabelCookie(label: string) {
  return `${AUTH_USER_LABEL_COOKIE_NAME}=${encodeURIComponent(label)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; samesite=lax`
}

export function serializeAuthUserAvatarCookie(value: string) {
  return `${AUTH_USER_AVATAR_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; samesite=lax`
}

export function clearAuthSessionCookie() {
  return `${AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`
}

export function clearAuthUserLabelCookie() {
  return `${AUTH_USER_LABEL_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`
}

export function clearAuthUserAvatarCookie() {
  return `${AUTH_USER_AVATAR_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`
}

export function readAuthUserLabelCookie(value: string | undefined | null) {
  if (!value) {
    return "User"
  }

  try {
    return decodeURIComponent(value).trim() || "User"
  } catch {
    return value.trim() || "User"
  }
}

export function readAuthUserAvatarCookie(value: string | undefined | null) {
  if (!value) {
    return ""
  }

  try {
    return decodeURIComponent(value).trim()
  } catch {
    return value.trim()
  }
}
