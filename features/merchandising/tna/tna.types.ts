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

export type UserSummary = {
  id?: string | null
  name?: string | null
}

export type BuyerSummary = {
  id?: string | null
  name?: string | null
  displayName?: string | null
}

export type JobSummary = {
  id?: string | null
  jobNo?: string | null
  buyerId?: string | null
  buyer?: BuyerSummary | null
  jobDetails?: Array<{ purchaseOrder?: { pono?: string | null } | null }> | null
}

export type TnaTaskSummary = {
  id: string
  name: string
  isActive?: boolean
}

export type TnaDetailRecord = {
  id: string
  tnaId: string
  taskId: string
  task?: TnaTaskSummary | null
  executionDate?: string | null
  days?: number | null
  sortOrder?: number | null
  relationFormula?: string | null
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

export type TnaDetailRevisionRecord = {
  id: string
  tnaDetailId: string
  previousExecutionDate?: string | null
  newExecutionDate?: string | null
  note?: string | null
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

export type TnaRecord = {
  id: string
  buyerId: string
  buyer?: BuyerSummary | null
  jobId: string
  job?: JobSummary | null
  leadTime?: number | null
  tnaDetails?: TnaDetailRecord[]
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

export type TnaFilterValues = {
  buyerId: string
  jobId: string
  leadTime?: string
}

export type TnaDetailFormValues = {
  id: string
  taskId: string
  executionDate: string
  days: string
  sortOrder?: number
  relationFormula: string
  isPersisted?: boolean
  revisions?: TnaDetailRevisionFormValues[]
}

export type TnaDetailRevisionFormValues = {
  previousExecutionDate: string
  newExecutionDate: string
  note?: string
}

export type TnaFormValues = {
  buyerId: string
  jobId: string
  leadTime: string
  tnaDetails: TnaDetailFormValues[]
}

export type TnaTaskRecord = {
  id: string
  name: string
  isActive?: boolean
}

