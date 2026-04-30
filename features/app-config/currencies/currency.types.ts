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

export type CurrencyRecord = {
  id: number
  currencyName: string
  currencyCode: string
  rate: number
  symbol: string
  isDefault?: boolean
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

export type CurrencyFilterValues = {
  currencyName: string
  currencyCode: string
  symbol: string
}

export type CurrencyFormValues = {
  currencyName: string
  currencyCode: string
  rate: string
  symbol: string
  isDefault: boolean
  isActive: boolean
}
