export type ApiResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  timestamp?: string
}

export type OrganizationRecord = {
  id: string
  name: string
  address?: string | null
  contact?: string | null
}

export type OrganizationFormValues = {
  name: string
  address: string
  contact: string
}
