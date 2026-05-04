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

export type CountrySummary = {
  id?: number | null
  name?: string | null
}

export type BuyerRecord = {
  id: string
  name: string
  displayName: string
  contact?: string | null
  email?: string | null
  countryId?: number | null
  address?: string | null
  remarks?: string | null
  isActive?: boolean
  country?: CountrySummary | null
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

export type BuyerFilterValues = {
  name: string
  displayName: string
  contact: string
  email: string
  countryId: string
  address: string
  isActive: string
  remarks: string
}

export type BuyerFormValues = {
  name: string
  displayName: string
  contact: string
  email: string
  countryId: string
  address: string
  remarks: string
  isActive: boolean
}

export type BuyerUploadReport = {
  inserted: number
  skipped: number
  missing?: {
    countries?: string[]
  }
}
