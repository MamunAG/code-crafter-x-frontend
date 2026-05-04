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

export type FileSummary = {
  id?: number | null
  file_id?: number | null
  file_name?: string | null
  original_name?: string | null
  file_path?: string | null
  file_url?: string | null
  public_url?: string | null
  thumbnail_url?: string | null
  mime_type?: string | null
}

export type EmployeeGender = "Male" | "Female" | "Others"

export type EmployeeFactorySummary = {
  id: string
  name?: string | null
  displayName?: string | null
  code?: string | null
}

export type EmployeeDesignationSummary = {
  id: string
  designationName?: string | null
}

export type EmployeeDepartmentSummary = {
  id: string
  departmentName?: string | null
}

export type EmployeeRecord = {
  id: string
  organizationId?: string | null
  factoryId: string
  imageId?: number | null
  employeeCode: string
  employeeName: string
  designationId?: string | null
  departmentId?: string | null
  phoneNo?: string | null
  email?: string | null
  gender?: EmployeeGender | null
  joiningDate?: string | null
  nidNo?: string | null
  address?: string | null
  remarks?: string | null
  isActive?: boolean
  factory?: EmployeeFactorySummary | null
  image?: FileSummary | null
  designation?: EmployeeDesignationSummary | null
  department?: EmployeeDepartmentSummary | null
  created_at?: string | null
  updated_at?: string | null
  deleted_at?: string | null
  deleted_by_id?: string | null
  deleted_by_user?: UserSummary | null
}

export type EmployeeFilterValues = {
  factoryId: string
  employeeCode: string
  employeeName: string
  designationId: string
  departmentId: string
  gender: string
  isActive: string
}

export type EmployeeFormValues = {
  factoryId: string
  imageId: string
  employeeCode: string
  employeeName: string
  designationId: string
  departmentId: string
  phoneNo: string
  email: string
  gender: string
  joiningDate: string
  nidNo: string
  address: string
  remarks: string
  isActive: boolean
}

export type EmployeeUploadReport = {
  inserted: number
  skipped: number
  skippedReasons?: {
    duplicateEmployees?: string[]
    missingRequiredRows?: number
    invalidJoiningDateRows?: number
  }
  missing?: {
    factories?: string[]
    departments?: string[]
    designations?: string[]
  }
}
