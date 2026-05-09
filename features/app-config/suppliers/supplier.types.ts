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

export type SupplierRecord = {
  id: string
  name: string
  code?: string | null
  contact?: string | null
  email?: string | null
  address?: string | null
  remarks?: string | null
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

export type SupplierFilterValues = {
  name: string
  code: string
  contact: string
  email: string
  address: string
  isActive: string
}

export type SupplierFormValues = {
  name: string
  code: string
  contact: string
  email: string
  address: string
  remarks: string
  isActive: boolean
}
