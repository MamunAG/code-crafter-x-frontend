export type MasterDataRecord = {
  id: string
  organizationId: string
  type: string
  code: string
  name: string
  nameBn?: string | null
  settings: Record<string, unknown>
  isActive: boolean
  rowVersion: number
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
  deletedById?: string | null
}

export type PaginationMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export type PaginatedMasterData = { items: MasterDataRecord[]; meta: PaginationMeta }
export type MasterDataFormValues = { code: string; name: string; nameBn: string; settings: Record<string, unknown>; isActive: boolean; rowVersion?: number }
export type HolidayRow = { date: string; name: string; nameBn?: string }

export type FieldOption = { label: string; value: string }
export type MasterDataField = {
  key: string
  label: string
  kind: "text" | "number" | "select" | "boolean" | "weekday-multi" | "holidays"
  description?: string
  placeholder?: string
  options?: FieldOption[]
  min?: number
  max?: number
  step?: number
  defaultValue?: unknown
}

export type MasterDataConfig = {
  slug: string
  apiPath: string
  title: string
  singular: string
  description: string
  permissionMenuName: string
  fields: MasterDataField[]
}
