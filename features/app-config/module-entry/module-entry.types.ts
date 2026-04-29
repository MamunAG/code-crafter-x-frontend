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

export type PaginatedResponse<T> = {
  items: T[]
  meta: PaginationMeta
}

export type ModuleEntryRecord = {
  id: string
  moduleName: string
  moduleKey: string
  description?: string | null
  displayOrder: number
  isActive: boolean
  created_at?: string
  updated_at?: string | null
  deleted_at?: string | null
  deleted_by_id?: string | null
}

export type ModuleEntryFormValues = {
  moduleName: string
  moduleKey: string
  description: string
  displayOrder: number
  isActive: boolean
}

export type ModuleEntryFilterValues = {
  moduleName: string
  moduleKey: string
  isActive: "all" | "active" | "inactive"
  deletedOnly?: boolean
}
