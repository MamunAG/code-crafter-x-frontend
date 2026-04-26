import type { ApiResponse, NotificationListResponse, NotificationRecord } from "./notification.types"

function buildApiUrl(apiUrl: string, path: string) {
  return new URL(path, apiUrl)
}

async function readJsonResponse<T>(
  response: Response,
  fallbackMessage = "Unable to complete the notification request right now.",
) {
  let payload: ApiResponse<T> | null = null

  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || fallbackMessage)
  }

  return payload
}

export async function fetchNotifications({
  apiUrl,
  accessToken,
  limit = 20,
}: {
  apiUrl: string
  accessToken: string
  limit?: number
}): Promise<NotificationListResponse> {
  const url = buildApiUrl(apiUrl, "/api/v1/notifications")
  url.searchParams.set("limit", String(limit))

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const responseData = await readJsonResponse<NotificationListResponse>(
    response,
    "Unable to load notifications right now.",
  )

  if (!responseData.data) {
    throw new Error("The notification list was returned without data.")
  }

  return responseData.data
}

export async function markNotificationRead({
  apiUrl,
  accessToken,
  notificationId,
}: {
  apiUrl: string
  accessToken: string
  notificationId: string
}): Promise<NotificationRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/notifications/${notificationId}/read`), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  const responseData = await readJsonResponse<NotificationRecord>(
    response,
    "Unable to mark this notification as read right now.",
  )

  if (!responseData.data) {
    throw new Error("The notification was updated, but the updated record was not returned.")
  }

  return responseData.data
}

export async function markAllNotificationsRead({
  apiUrl,
  accessToken,
}: {
  apiUrl: string
  accessToken: string
}): Promise<NotificationListResponse> {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/notifications/read-all"), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  const responseData = await readJsonResponse<NotificationListResponse>(
    response,
    "Unable to mark all notifications as read right now.",
  )

  if (!responseData.data) {
    throw new Error("The notification list was returned without data.")
  }

  return responseData.data
}

export async function registerFirebaseToken({
  apiUrl,
  accessToken,
  token,
}: {
  apiUrl: string
  accessToken: string
  token: string
}): Promise<void> {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/notifications/firebase-token"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      token,
      platform: "web",
      userAgent: window.navigator.userAgent,
    }),
  })

  await readJsonResponse(response, "Unable to register this browser for push notifications.")
}
