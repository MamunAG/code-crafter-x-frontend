"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  clearAuthSessionCookie,
  clearAuthUserAvatarCookie,
  clearAuthUserLabelCookie,
  getAuthInitials,
  getAuthUserLabel,
  parseStoredAuthUser,
  serializeAuthUserAvatarCookie,
  serializeAuthUserLabelCookie,
} from "@/lib/auth-session"
import type { LoggedInUser } from "@/features/auth/login/login.types"

import { fetchProfile } from "./profile.service"
import type { BackendProfileUser } from "./profile.types"

type ProfileDashboardProps = {
  apiUrl: string
}

type DetailRowProps = {
  label: string
  value?: string | number | null
}

function getProfileDisplayName(profile?: BackendProfileUser | null) {
  if (!profile) {
    return "User"
  }

  return (
    profile.display_name ||
    profile.name ||
    profile.user_name ||
    profile.email ||
    "User"
  )
}

function getProfileImageUrl(profile?: BackendProfileUser | null) {
  if (!profile?.profile_pic) {
    return ""
  }

  const profilePic = profile.profile_pic

  return (
    profilePic.public_url ||
    profilePic.file_url ||
    profilePic.thumbnail_url ||
    ""
  )
}

function humanizeStatus(value?: string | null) {
  if (!value) {
    return "Unknown"
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function normalizeStatusKey(value?: string | null) {
  return (value ?? "").trim().toLowerCase()
}

function getStatusBadgeVariant(value?: string | null) {
  const normalized = normalizeStatusKey(value)

  if (!normalized) {
    return "outline" as const
  }

  if (normalized.includes("active") || normalized.includes("verified")) {
    return "secondary" as const
  }

  if (
    normalized.includes("inactive") ||
    normalized.includes("disabled") ||
    normalized.includes("blocked") ||
    normalized.includes("suspend")
  ) {
    return "destructive" as const
  }

  return "outline" as const
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not available"
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

function formatDateOnly(value?: string | null) {
  if (!value) {
    return "Not available"
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(parsed)
}

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("en-US").format(value ?? 0)
}

function DetailRow({ label, value }: DetailRowProps) {
  const displayValue = value === "" || value == null ? "Not available" : value

  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 py-3 last:border-b-0 dark:border-white/10">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-medium text-slate-900 dark:text-slate-100">
        {displayValue}
      </span>
    </div>
  )
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string
  value: number
  description: string
}) {
  return (
    <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardContent className="p-5">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {formatNumber(value)}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-60" />
                <Skeleton className="h-4 w-72" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-28 rounded-full" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-28 rounded-xl" />
              <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-[28rem] rounded-3xl lg:col-span-7" />
        <Skeleton className="h-[28rem] rounded-3xl lg:col-span-5" />
        <Skeleton className="h-72 rounded-3xl lg:col-span-12" />
      </div>
    </div>
  )
}

function ProfileError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <Alert variant="destructive" className="border-red-200 bg-red-50/80 shadow-sm dark:border-red-500/30 dark:bg-red-500/10">
      <AlertTitle className="text-sm font-semibold">Unable to load profile</AlertTitle>
      <AlertDescription className="mt-1 text-sm leading-6 text-red-800/90 dark:text-red-200/90">
        {message}
      </AlertDescription>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={onRetry} className="rounded-xl">
          Retry
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/sign-in">Sign in again</Link>
        </Button>
      </div>
    </Alert>
  )
}

export function ProfileDashboard({ apiUrl }: ProfileDashboardProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<BackendProfileUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      setError("")

      try {
        if (typeof window === "undefined") {
          return
        }

        const accessToken = window.localStorage.getItem("access_token")
        const storedUser = parseStoredAuthUser(
          window.localStorage.getItem("auth_user"),
        ) as LoggedInUser | null
        const userId = storedUser?.id

        if (!accessToken || !userId) {
          router.replace("/sign-in")
          return
        }

        const user = await fetchProfile({
          apiUrl,
          userId,
          accessToken,
        })

        if (!active) {
          return
        }

        setProfile(user)
        window.localStorage.setItem("auth_user", JSON.stringify(user))

        const userLabel = getAuthUserLabel(user)
        document.cookie = serializeAuthUserLabelCookie(userLabel)

        const userImageUrl = getProfileImageUrl(user)
        if (userImageUrl) {
          document.cookie = serializeAuthUserAvatarCookie(userImageUrl)
        } else {
          document.cookie = clearAuthUserAvatarCookie()
        }
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load your profile right now."

        if (
          message.toLowerCase().includes("session expired") ||
          message.toLowerCase().includes("unauthorized")
        ) {
          window.localStorage.removeItem("access_token")
          window.localStorage.removeItem("refresh_token")
          window.localStorage.removeItem("auth_user")
          document.cookie = clearAuthSessionCookie()
          document.cookie = clearAuthUserLabelCookie()
          document.cookie = clearAuthUserAvatarCookie()
          router.replace("/sign-in")
          return
        }

        setError(message)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [apiUrl, refreshKey, router])

  if (loading) {
    return <ProfileSkeleton />
  }

  if (error) {
    return (
      <ProfileError
        message={error}
        onRetry={() => {
          setRefreshKey((current) => current + 1)
        }}
      />
    )
  }

  if (!profile) {
    return null
  }

  const displayName = getProfileDisplayName(profile)
  const imageUrl = getProfileImageUrl(profile)
  const label = getAuthUserLabel(profile, displayName)
  const email = profile.email || "Not available"
  const username = profile.user_name ? `@${profile.user_name}` : "Not available"
  const role = humanizeStatus(profile.role)
  const status = humanizeStatus(profile.status)
  const statusVariant = getStatusBadgeVariant(profile.status)
  const emailBadge = profile.is_email_verified ? "Verified" : "Unverified"
  const notificationsBadge = profile.is_enable_notifications
    ? "Enabled"
    : "Disabled"
  const locationSummary = [
    profile.location?.area,
    profile.location?.city,
    profile.location?.state,
    profile.location?.country,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar
                size="lg"
                className="h-20 w-20 ring-4 ring-white shadow-xl dark:ring-slate-950"
              >
                {imageUrl ? <AvatarImage src={imageUrl} alt={label} /> : null}
                <AvatarFallback className="bg-slate-900 text-lg font-semibold text-white dark:bg-white dark:text-slate-900">
                  {getAuthInitials(label)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Professional profile
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                    {label}
                  </h1>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {username} - {email}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {role}
                  </Badge>
                  <Badge variant={statusVariant} className="rounded-full px-3 py-1">
                    {status}
                  </Badge>
                  <Badge variant={profile.is_email_verified ? "secondary" : "destructive"} className="rounded-full px-3 py-1">
                    {emailBadge}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    Notifications {notificationsBadge}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/account">Edit profile</Link>
              </Button>
              <Button asChild className="rounded-xl">
                <Link href="/">Back home</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Likes"
          value={profile.likes ?? 0}
          description="Community engagements tied to the current account."
        />
        <MetricCard
          label="Favorites"
          value={profile.faves ?? 0}
          description="Items and activities the backend currently tracks."
        />
        <MetricCard
          label="Admirers"
          value={profile.admieres ?? 0}
          description="Audience reach and appreciation signals."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:col-span-7 dark:border-white/10 dark:bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-lg">Identity & contact</CardTitle>
            <CardDescription>
              Personal details exposed by the backend profile record.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <DetailRow label="Full name" value={profile.name} />
            <DetailRow label="Display name" value={profile.display_name} />
            <DetailRow label="Username" value={profile.user_name ? `@${profile.user_name}` : null} />
            <DetailRow label="Email" value={profile.email} />
            <DetailRow label="Phone" value={profile.phone_no} />
            <DetailRow label="Gender" value={profile.gender} />
            <DetailRow label="Date of birth" value={formatDateOnly(profile.date_of_birth)} />
            <div className="pt-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">Bio</p>
              <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-200">
                {profile.bio || "No bio has been added yet."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:col-span-5 dark:border-white/10 dark:bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-lg">Account activity</CardTitle>
            <CardDescription>
              Verification, visibility, and latest backend activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <DetailRow label="Role" value={role} />
            <DetailRow label="Status" value={status} />
            <DetailRow
              label="Email verification"
              value={profile.is_email_verified ? "Verified" : "Not verified"}
            />
            <DetailRow
              label="Notifications"
              value={profile.is_enable_notifications ? "Enabled" : "Disabled"}
            />
            <DetailRow label="Last seen" value={formatDate(profile.last_seen_at)} />
            <DetailRow label="Joined" value={formatDate(profile.created_at)} />
            <DetailRow label="Updated" value={formatDate(profile.updated_at)} />
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:col-span-12 dark:border-white/10 dark:bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-lg">Location</CardTitle>
            <CardDescription>
              Current user location snapshot from the backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {locationSummary ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {locationSummary}
                </Badge>
                {profile.location?.area ? (
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    Area: {profile.location.area}
                  </Badge>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
              <DetailRow label="Area" value={profile.location?.area} />
              <DetailRow label="City" value={profile.location?.city} />
              <DetailRow label="State" value={profile.location?.state} />
              <DetailRow label="Country" value={profile.location?.country} />
              <DetailRow
                label="Latitude"
                value={
                  typeof profile.location?.latitude === "number"
                    ? profile.location.latitude.toFixed(6)
                    : null
                }
              />
              <DetailRow
                label="Longitude"
                value={
                  typeof profile.location?.longitude === "number"
                    ? profile.location.longitude.toFixed(6)
                    : null
                }
              />
            </div>

            <Separator className="bg-slate-200/80 dark:bg-white/10" />

            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              {locationSummary
                ? "This location data comes from the most recent stored user location record in the backend."
                : "No location has been shared for this account yet."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
