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
  user_name?: string | null
  display_name?: string | null
}

export type FactorySummary = {
  id?: string | null
  name?: string | null
  displayName?: string | null
}

export type BuyerSummary = {
  id?: string | null
  name?: string | null
  displayName?: string | null
}

export type StyleSummary = {
  id?: string | null
  styleNo?: string | null
  styleName?: string | null
}

export type SizeSummary = {
  id?: number | null
  sizeName?: string | null
}

export type ColorSummary = {
  id?: number | null
  colorName?: string | null
  colorDisplayName?: string | null
}

export type PurchaseOrderSummary = {
  id?: string | null
  pono?: string | null
}

export type OrderType = "Retail" | "Promotional"

export type JobDetailRecord = {
  id: string
  jobId: string
  poId: string
  purchaseOrder?: PurchaseOrderSummary | null
  styleId: string
  style?: StyleSummary | null
  sizeId: number
  size?: SizeSummary | null
  colorId: number
  color?: ColorSummary | null
  quantity?: number | null
  fob?: number | null
  cm?: number | null
  deliveryDate?: string | null
  remarks?: string | null
}

export type JobRecord = {
  id: string
  factoryId: string
  factory?: FactorySummary | null
  buyerId: string
  buyer?: BuyerSummary | null
  merchandiserId?: number | null
  ordertype?: OrderType | null
  totalPoQty?: number | null
  poReceiveDate?: string | null
  isActive?: boolean
  jobDetails?: JobDetailRecord[]
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

export type JobFilterValues = {
  factoryId: string
  buyerId: string
  merchandiserId: string
  ordertype: string
  pono: string
  isActive: string
}

export type JobDetailFormValues = {
  id: string
  pono: string
  styleId: string
  styleLabel: string
  sizeId: string
  sizeLabel: string
  colorId: string
  colorLabel: string
  quantity: string
  fob: string
  cm: string
  deliveryDate: string
  remarks: string
}

export type JobFormValues = {
  factoryId: string
  buyerId: string
  merchandiserId: string
  ordertype: string
  totalPoQty: string
  poReceiveDate: string
  isActive: boolean
  jobDetails: JobDetailFormValues[]
}

export type JobDialogSectionId = "basic-info" | "details" | "status"

export type JobFormError = {
  section: JobDialogSectionId
  message: string
}
