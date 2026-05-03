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

export type PaginatedResponse<T> = {
    items: T[]
    meta: PaginationMeta
}

export type FactoryRecord = {
    id: string
    name: string
    displayName?: string | null
    code?: string | null
    contact?: string | null
    email?: string | null
    organizationId?: string | null
    imageId?: number | null
    image?: FileSummary | null
    address?: string | null
    remarks?: string | null
    isActive?: boolean

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

export type FactoryFilterValues = {
    name: string
    displayName: string
    code: string
    contact: string
    email: string
    address: string
    isActive: string
}

export type FactoryFormValues = {
    name: string
    displayName: string
    code: string
    contact: string
    email: string
    imageId: string
    address: string
    remarks: string
    isActive: boolean
}

export type FactoryDialogSectionId =
    | "basic-info"
    | "contact-info"
    | "remarks-status"

export type FactoryFormError = {
    message: string
    section: FactoryDialogSectionId
}
