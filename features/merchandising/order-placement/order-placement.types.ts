import type {
  BuyerSummary,
  ColorSummary,
  JobRecord,
  PurchaseOrderSummary,
  SizeSummary,
  StyleSummary,
  UserSummary,
} from "@/features/merchandising/jobs/job.types"

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

export type CurrencySummary = {
  id?: number | null
  currencyName?: string | null
  currencyCode?: string | null
  symbol?: string | null
}

export type SupplierSummary = {
  id?: string | null
  name?: string | null
  code?: string | null
}

export type OrderPlacementDetailRecord = {
  id: string
  orderPlacementId: string
  jobDetailId?: string | null
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
  cuttingLimitPercentage?: number | null
  remarks?: string | null
  factoryCmPerDzn?: number | null
  factoryFob?: number | null
  factoryShipmentDate?: string | null
  totalFactoryCm?: number | null
  totalFactoryFob?: number | null
}

export type OrderPlacementRecord = {
  id: string
  buyerId: string
  buyer?: BuyerSummary | null
  jobId: string
  job?: JobRecord | null
  currencyId: number
  currency?: CurrencySummary | null
  placementDate?: string | null
  exchangeRateBDT?: number | null
  factoryId: string
  factory?: SupplierSummary | null
  isPlaced?: boolean
  orderPlacementDetails?: OrderPlacementDetailRecord[]
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

export type OrderPlacementFilterValues = {
  buyerId: string
  jobId: string
  currencyId: string
  factoryId: string
  placementDate: string
  isPlaced: string
  pono: string
}

export type OrderPlacementDetailFormValues = {
  id: string
  jobDetailId: string
  jobId: string
  poId: string
  poLabel: string
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
  cuttingLimitPercentage: string
  remarks: string
  factoryCmPerDzn: string
  factoryFob: string
  factoryShipmentDate: string
  totalFactoryCm: string
  totalFactoryFob: string
}

export type OrderPlacementFormValues = {
  buyerId: string
  jobId: string
  currencyId: string
  placementDate: string
  exchangeRateBDT: string
  factoryId: string
  isPlaced: boolean
  orderPlacementDetails: OrderPlacementDetailFormValues[]
}

export type OrderPlacementDialogSectionId = "basic-info" | "details" | "status"

export type OrderPlacementFormError = {
  section: OrderPlacementDialogSectionId
  message: string
}
