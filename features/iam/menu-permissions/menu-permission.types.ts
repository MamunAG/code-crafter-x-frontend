import type { MenuRecord } from "@/features/app-config/menu/menu.types"
import type { OrganizationMemberUserRecord } from "@/features/organization/organization.types"

export type ApiResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  timestamp?: string
}

export type MenuPermissionRecord = {
  id: string
  organizationId: string
  userId: string
  menuId: string
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  menu?: MenuRecord
  user?: OrganizationMemberUserRecord
}

export type MenuPermissionValue = {
  menuId: string
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}
