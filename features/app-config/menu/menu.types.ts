import type { OrganizationRecord } from "@/features/organization/organization.types"

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

export type MenuRecord = {
  id: string
  organizationId: string
  menuName: string
  menuPath: string
  description?: string | null
  displayOrder: number
  isActive: boolean
  organization?: OrganizationRecord
  created_at?: string
  updated_at?: string | null
}

export type MenuFormValues = {
  organizationId: string
  menuName: string
  menuPath: string
  description: string
  displayOrder: number
  isActive: boolean
}
