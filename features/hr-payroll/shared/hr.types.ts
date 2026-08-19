export type HrApiResponse<T> = {
  success: boolean
  message?: string
  data?: T
}

export type HrPaginationMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export type HrPaginatedResponse<T> = {
  items: T[]
  meta: HrPaginationMeta
}

export type HrBaseRecord = {
  id: string
  organizationId?: string
  createdAt?: string
  updatedAt?: string
  created_at?: string
  updated_at?: string
  rowVersion?: number
}

export type HrOption = {
  value: string
  label: string
}

