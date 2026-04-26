import type { OrganizationMembershipRecord } from "@/features/organization/organization.types"

export type OrganizationAccessRequestStatus = "pending" | "approved" | "rejected"

export type OrganizationAccessRequestRequester = {
  id: string
  name: string
  email: string
}

export type OrganizationAccessRequestReviewUser = {
  id: string
  name: string
  email: string
}

export type OrganizationAccessRequestRecord = {
  id: string
  requestedByUserId: string
  requestedAdminUserId: string
  requestedAdminEmail: string
  message?: string | null
  status: OrganizationAccessRequestStatus
  reviewedByUserId?: string | null
  reviewedAt?: string | null
  reviewNote?: string | null
  requestedByUser: OrganizationAccessRequestRequester
  requestedAdminUser: OrganizationAccessRequestReviewUser
  reviewedByUser?: OrganizationAccessRequestReviewUser | null
  created_at: string
  updated_at: string
}

export type OrganizationAccessRequestFormValues = {
  adminEmail: string
  message: string
}

export type OrganizationAccessRequestAssignment = {
  organizationId: string
  role: "admin" | "user"
}

export type OrganizationMembershipOption = OrganizationMembershipRecord
