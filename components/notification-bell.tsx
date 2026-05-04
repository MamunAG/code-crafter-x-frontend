"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerFirebaseToken,
} from "@/features/notifications/notification.service"
import type { NotificationRecord } from "@/features/notifications/notification.types"
import {
  isFirebaseMessagingConfigured,
  listenForForegroundMessages,
  requestFirebaseMessagingToken,
} from "@/lib/firebase-client"
import { cn } from "@/lib/utils"

const NOTIFICATION_PAGE_SIZE = 10

function formatNotificationTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function resolveNavigationPath(link?: string | null) {
  if (!link) {
    return "/"
  }

  try {
    const url = new URL(link, window.location.origin)
    return `${url.pathname}${url.search}${url.hash}` || "/"
  } catch {
    return link
  }
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [workingId, setWorkingId] = useState("")
  const [markingAll, setMarkingAll] = useState(false)

  const hasUnread = unreadCount > 0
  const unreadLabel = useMemo(() => (unreadCount > 9 ? "9+" : String(unreadCount)), [unreadCount])

  const loadNotifications = useCallback(async ({ silent = false, nextPage = 1, append = false } = {}) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const accessToken = window.localStorage.getItem("access_token")

    if (!apiUrl || !accessToken) {
      return
    }

    if (append) {
      setLoadingMore(true)
    } else if (!silent) {
      setLoading(true)
    }

    try {
      const result = await fetchNotifications({
        apiUrl,
        accessToken,
        page: nextPage,
        limit: NOTIFICATION_PAGE_SIZE,
      })

      setNotifications((currentNotifications) =>
        append ? [...currentNotifications, ...result.items] : result.items,
      )
      setUnreadCount(result.unreadCount)
      setPage(result.meta.page)
      setHasNextPage(result.meta.hasNextPage)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load notifications right now."
      toast.error(message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    void loadNotifications({ silent: true })

    const interval = window.setInterval(() => {
      void loadNotifications({ silent: true })
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [loadNotifications])

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const accessToken = window.localStorage.getItem("access_token")

    if (!apiUrl || !accessToken || !isFirebaseMessagingConfigured()) {
      return
    }

    void requestFirebaseMessagingToken()
      .then((token) => {
        if (!token) {
          return
        }

        return registerFirebaseToken({
          apiUrl,
          accessToken,
          token,
        })
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    void listenForForegroundMessages((payload) => {
      const title = payload.notification?.title || payload.data?.title || "New notification"
      const body = payload.notification?.body || payload.data?.body || ""
      const link = payload.fcmOptions?.link || payload.data?.link

      toast.info(title, {
        description: body,
        action: link
          ? {
              label: "Open",
              onClick: () => router.push(resolveNavigationPath(link)),
            }
          : undefined,
      })
      void loadNotifications({ silent: true })
    }).then((cleanup) => {
      unsubscribe = cleanup
    })

    return () => {
      unsubscribe?.()
    }
  }, [loadNotifications, router])

  async function handleNotificationClick(notification: NotificationRecord) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const accessToken = window.localStorage.getItem("access_token")

    if (!apiUrl || !accessToken) {
      return
    }

    setWorkingId(notification.id)

    try {
      if (!notification.isRead) {
        await markNotificationRead({
          apiUrl,
          accessToken,
          notificationId: notification.id,
        })
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                isRead: true,
                readAt: new Date().toISOString(),
              }
            : item,
        ),
      )
      setUnreadCount((currentCount) =>
        notification.isRead ? currentCount : Math.max(currentCount - 1, 0),
      )
      setOpen(false)
      router.push(resolveNavigationPath(notification.link))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to open this notification right now."
      toast.error(message)
    } finally {
      setWorkingId("")
    }
  }

  async function handleMarkAllRead() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const accessToken = window.localStorage.getItem("access_token")

    if (!apiUrl || !accessToken) {
      return
    }

    setMarkingAll(true)

    try {
      const result = await markAllNotificationsRead({
        apiUrl,
        accessToken,
      })
      setNotifications(result.items)
      setUnreadCount(result.unreadCount)
      setPage(result.meta.page)
      setHasNextPage(result.meta.hasNextPage)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to mark notifications as read right now."
      toast.error(message)
    } finally {
      setMarkingAll(false)
    }
  }

  function handleLoadMore() {
    if (!hasNextPage || loadingMore) {
      return
    }

    void loadNotifications({
      silent: true,
      nextPage: page + 1,
      append: true,
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        title="Notifications"
        className={cn(
          "relative inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-white/20",
          open ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900" : "",
        )}
        onClick={() => {
          setOpen((currentOpen) => !currentOpen)
          void loadNotifications({ silent: true })
        }}
      >
        <Bell className="h-4 w-4" />
        {hasUnread ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.625rem] font-bold leading-none text-white shadow-sm">
            {unreadLabel}
          </span>
        ) : null}
        <span className="sr-only">Notifications</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15 dark:border-white/10 dark:bg-slate-950 dark:shadow-black/40">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
            <div>
              <p className="text-sm font-bold text-slate-950 dark:text-white">Notifications</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Most recent first
              </p>
            </div>
            <button
              type="button"
              className="rounded-full px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              disabled={!hasUnread || markingAll}
              onClick={() => void handleMarkAllRead()}
            >
              {markingAll ? "Saving" : "Mark all read"}
            </button>
          </div>

          <div className="max-h-[28rem] overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading notifications
              </div>
            ) : notifications.length > 0 ? (
              <>
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className={cn(
                      "w-full cursor-pointer rounded-2xl px-3 py-3 text-left transition hover:bg-slate-100 disabled:cursor-wait dark:hover:bg-white/10",
                      notification.isRead ? "opacity-75" : "bg-slate-50 dark:bg-white/5",
                    )}
                    disabled={workingId === notification.id}
                    onClick={() => void handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          notification.isRead ? "bg-slate-300 dark:bg-slate-700" : "bg-red-500",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-slate-950 dark:text-white">
                          {notification.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">
                          {notification.body}
                        </span>
                        <span className="mt-2 block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {formatNotificationTime(notification.created_at)}
                        </span>
                      </span>
                    </div>
                  </button>
                ))}
                {hasNextPage ? (
                  <button
                    type="button"
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                    disabled={loadingMore}
                    onClick={handleLoadMore}
                  >
                    {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {loadingMore ? "Loading more" : "Load more"}
                  </button>
                ) : null}
              </>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Access requests and approvals will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
