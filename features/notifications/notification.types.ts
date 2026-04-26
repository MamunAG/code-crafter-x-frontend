export type ApiResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
  timestamp?: string
}

export type NotificationRecord = {
  id: string
  userId: string
  title: string
  body: string
  link?: string | null
  type: string
  isRead: boolean
  readAt?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

export type NotificationListResponse = {
  items: NotificationRecord[]
  unreadCount: number
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
  }
}
