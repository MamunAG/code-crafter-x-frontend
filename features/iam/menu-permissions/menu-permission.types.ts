import type { MenuRecord } from "@/features/app-config/menu/menu.types"
import type {
  OrganizationMemberUserRecord,
  OrganizationMembershipRecord,
} from "@/features/organization/organization.types"

export type ApiResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  timestamp?: string
}

export type UserOptionRecord = OrganizationMemberUserRecord & {
  role?: "admin" | "user"
  status?: string
}

export type ManageableUserMappingRecord = OrganizationMembershipRecord

export type MenuOrganizationMapRecord = {
  menuId: string
  organizationId: string
  menu?: MenuRecord
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
