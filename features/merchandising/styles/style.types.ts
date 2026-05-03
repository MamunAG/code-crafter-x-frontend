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

export type BuyerSummary = {
  id?: string | null
  name?: string | null
  displayName?: string | null
}

export type CurrencySummary = {
  id?: number | null
  currencyName?: string | null
  currencyCode?: string | null
  symbol?: string | null
}

export type ColorSummary = {
  id?: number | null
  colorName?: string | null
  colorDisplayName?: string | null
  colorHexCode?: string | null
}

export type SizeSummary = {
  id?: number | null
  sizeName?: string | null
}

export type EmbellishmentSummary = {
  id?: number | null
  name?: string | null
}

export type StyleToColorMapRecord = {
  id?: number
  colorId: number
  color?: ColorSummary | null
}

export type StyleToSizeMapRecord = {
  id?: number
  sizeId: number
  size?: SizeSummary | null
}

export type StyleToEmbellishmentMapRecord = {
  id?: number
  embellishmentId: number
  embellishment?: EmbellishmentSummary | null
}

export type StyleRecord = {
  id: string
  productType?: string | null
  buyerId: string
  buyer?: BuyerSummary | null
  organizationId?: string | null
  styleNo: string
  styleName?: string | null
  itemType?: string | null
  productDepartment?: string | null
  cmSewing?: number | null
  currencyId: number
  currency?: CurrencySummary | null
  smvSewing?: number | null
  smvSewingSideSeam?: number | null
  smvCutting?: number | null
  smvCuttingSideSeam?: number | null
  smvFinishing?: number | null
  imageId?: number | null
  remarks?: string | null
  isActive?: boolean
  itemUom?: "Pcs" | "Set" | string | null
  productFamily?: string | null
  styleToColorMaps?: StyleToColorMapRecord[]
  styleToSizeMaps?: StyleToSizeMapRecord[]
  styleToEmbellishmentMaps?: StyleToEmbellishmentMapRecord[]
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

export type StyleFilterValues = {
  productType: string
  buyerId: string
  styleNo: string
  styleName: string
  itemType: string
  currencyId: string
  isActive: string
}

export type StyleChildOptionValue = {
  id: string
  value: string
  label: string
}

export type StyleFormValues = {
  productType: string
  buyerId: string
  styleNo: string
  styleName: string
  itemType: string
  productDepartment: string
  cmSewing: string
  currencyId: string
  smvSewing: string
  smvSewingSideSeam: string
  smvCutting: string
  smvCuttingSideSeam: string
  smvFinishing: string
  imageId: string
  remarks: string
  isActive: boolean
  itemUom: string
  productFamily: string
  colors: StyleChildOptionValue[]
  sizes: StyleChildOptionValue[]
  embellishments: StyleChildOptionValue[]
}

export type StyleDialogSectionId =
  | "basic-info"
  | "production-smv"
  | "colors"
  | "sizes"
  | "embellishments"
  | "remarks-status"

export type StyleFormError = {
  message: string
  section: StyleDialogSectionId
}
