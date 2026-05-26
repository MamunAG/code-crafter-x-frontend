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

export type MaterialSummary = {
  id?: string | null
  name?: string | null
  code?: string | null
}

export type UnitSummary = {
  id?: number | null
  name?: string | null
}

export type CurrencySummary = {
  id?: number | null
  currencyName?: string | null
  currencyCode?: string | null
  symbol?: string | null
}

export type FabricProcessSummary = {
  id?: number | null
  name?: string | null
}

export type FabricCostingYarnProcessRecord = {
  id: string
  fabricCostingYarnId?: string
  processId?: number | null
  process?: FabricProcessSummary | null
  rateUnitFabric?: number | string | null
  wastagePercentage?: number | string | null
}

export type FabricCostingYarnRecord = {
  id: string
  fabricCostingId?: string
  yarnId?: string | null
  yarn?: MaterialSummary | null
  percentagePerUnitFabric?: number | string | null
  yarnPricePerUnit?: number | string | null
  totalYarnPrice?: number | string | null
  yarnWiseProcesses?: FabricCostingYarnProcessRecord[]
}

export type FabricCostingCommonProcessRecord = {
  id: string
  fabricCostingId?: string
  processId?: number | null
  process?: FabricProcessSummary | null
  ratePerUnitFabric?: number | string | null
  wastagePercentage?: number | string | null
}

export type FabricCostingRecord = {
  id: string
  fabricId?: string | null
  fabric?: MaterialSummary | null
  qty?: number | string | null
  unitId?: number | null
  unit?: UnitSummary | null
  currencyId?: number | null
  currency?: CurrencySummary | null
  costName?: string | null
  organizationId?: string | null
  yarns?: FabricCostingYarnRecord[]
  commonProcesses?: FabricCostingCommonProcessRecord[]
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

export type FabricCostingYarnProcessFormValues = {
  id: string
  processId: string
  processLabel: string
  rateUnitFabric: string
  wastagePercentage: string
}

export type FabricCostingYarnFormValues = {
  id: string
  yarnId: string
  yarnLabel: string
  percentagePerUnitFabric: string
  yarnPricePerUnit: string
  totalYarnPrice: string
  yarnWiseProcesses: FabricCostingYarnProcessFormValues[]
}

export type FabricCostingCommonProcessFormValues = {
  id: string
  processId: string
  processLabel: string
  ratePerUnitFabric: string
  wastagePercentage: string
}

export type FabricCostingFormValues = {
  costName: string
  fabricId: string
  fabricLabel: string
  qty: string
  unitId: string
  unitLabel: string
  currencyId: string
  currencyLabel: string
  yarns: FabricCostingYarnFormValues[]
  commonProcesses: FabricCostingCommonProcessFormValues[]
}

export type FabricCostingFilterValues = {
  costName: string
  fabricId: string
  currencyId: string
  unitId: string
}

export type FabricCostingFormError = {
  message: string
}
