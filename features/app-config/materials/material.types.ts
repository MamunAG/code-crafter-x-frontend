export type ApiResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  timestamp?: string
}

export type PaginationMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export type UserSummary = {
  id?: string | null
  name?: string | null
  user_name?: string | null
  display_name?: string | null
}

export type PaginatedResponse<T> = {
  items: T[]
  meta: PaginationMeta
}

export type MaterialLookupRecord = {
  id: string | number
  name: string
  shortName?: string | null
}

export type FileSummary = {
  id?: number | null
  file_id?: number | null
  file_name?: string | null
  original_name?: string | null
  file_path?: string | null
  file_url?: string | null
  public_url?: string | null
  thumbnail_url?: string | null
  mime_type?: string | null
}

export type MaterialRecord = {
  id: string
  name: string
  code?: string | null
  description?: string | null
  unitId?: number | null
  materialGroupId?: string | null
  imageId?: number | null
  unit?: MaterialLookupRecord | null
  materialGroup?: MaterialLookupRecord | null
  image?: FileSummary | null
  organizationId?: string | null
  isActive?: boolean
  created_by_id?: string | null
  updated_by_id?: string | null
  deleted_by_id?: string | null
  created_by_user?: UserSummary | null
  updated_by_user?: UserSummary | null
  deleted_by_user?: UserSummary | null
  created_at?: string | null
  updated_at?: string | null
  deleted_at?: string | null
}

export type MaterialFilterValues = {
  name: string
  code: string
  description: string
  isActive: string
}

export type MaterialFormValues = {
  name: string
  code: string
  description: string
  unitId: string
  materialGroupId: string
  imageId: string
  isActive: boolean
}
