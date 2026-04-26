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
  isDefault?: boolean
}

export type OrganizationMembershipRecord = {
  userId: string
  organizationId: string
  role: "admin" | "user"
  isDefault: boolean
  organization: OrganizationRecord
  user?: OrganizationMemberUserRecord
}

export type OrganizationFormValues = {
  name: string
  address: string
  contact: string
  isDefault: boolean
}

export type OrganizationMemberUserRecord = {
  id: string
  name?: string | null
  email?: string | null
  user_name?: string | null
}
