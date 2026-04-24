"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
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

import { fetchProfile, uploadProfileFile, updateProfile } from "./profile.service"
import type {
  BackendProfileUser,
  ProfileUpdatePayload,
} from "./profile.types"
import type { LoggedInUser } from "@/features/auth/login/login.types"

type ProfileEditorProps = {
  apiUrl: string
}

type SessionState = {
  accessToken: string
  userId: string
}

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
]

function getProfileDisplayName(profile?: BackendProfileUser | null) {
  if (!profile) {
    return "User"
  }

  return (
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

  return (
    profile.profile_pic.public_url ||
    profile.profile_pic.file_url ||
    profile.profile_pic.thumbnail_url ||
    ""
  )
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

function humanizeStatus(value?: string | null) {
  if (!value) {
    return "Unknown"
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function getStatusBadgeVariant(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase()

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

function createDraftFromProfile(profile: BackendProfileUser): ProfileUpdatePayload {
  return {
    name: profile.name ?? "",
    user_name: profile.user_name ?? "",
    email: profile.email ?? "",
    phone_no: profile.phone_no ?? "",
    date_of_birth: profile.date_of_birth ? profile.date_of_birth.slice(0, 10) : "",
    gender: profile.gender ?? "",
    bio: profile.bio ?? "",
    role: profile.role ?? "user",
    status: profile.status ?? "active",
    profile_pic_id: profile.profile_pic_id ?? profile.profile_pic?.id ?? null,
  }
}

function buildSessionState(): SessionState | null {
  if (typeof window === "undefined") {
    return null
  }

  const accessToken = window.localStorage.getItem("access_token")
  const storedUser = parseStoredAuthUser(window.localStorage.getItem("auth_user")) as LoggedInUser | null

  if (!accessToken || !storedUser?.id) {
    return null
  }

  return {
    accessToken,
    userId: storedUser.id,
  }
}

function DataRow({
  label,
  value,
}: {
  label: string
  value?: string | number | null
}) {
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
          {new Intl.NumberFormat("en-US").format(value)}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

function EditorSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-28 rounded-full" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-28 rounded-xl" />
              <Skeleton className="h-10 w-28 rounded-xl" />
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
        <Skeleton className="h-[34rem] rounded-3xl lg:col-span-7" />
        <Skeleton className="h-[34rem] rounded-3xl lg:col-span-5" />
      </div>
    </div>
  )
}

function EditFeedback({
  title,
  description,
  variant = "default",
}: {
  title: string
  description: string
  variant?: "default" | "destructive"
}) {
  return (
    <Alert
      variant={variant === "destructive" ? "destructive" : "default"}
      className="border-white/60 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70"
    >
      <AlertTitle className="text-sm font-semibold">{title}</AlertTitle>
      <AlertDescription className="mt-1 text-sm leading-6">{description}</AlertDescription>
    </Alert>
  )
}

export function ProfileEditor({ apiUrl }: ProfileEditorProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [profile, setProfile] = useState<BackendProfileUser | null>(null)
  const [draft, setDraft] = useState<ProfileUpdatePayload | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [error, setError] = useState("")
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      setError("")

      try {
        const session = buildSessionState()
        if (!session) {
          router.replace("/sign-in")
          return
        }

        const user = await fetchProfile({
          apiUrl,
          userId: session.userId,
          accessToken: session.accessToken,
        })

        if (!active) {
          return
        }

        setProfile(user)
        setDraft(createDraftFromProfile(user))
        setAvatarPreviewUrl(getProfileImageUrl(user))
        setIsEditing(false)

        if (typeof window !== "undefined") {
          window.localStorage.setItem("auth_user", JSON.stringify(user))

          const userLabel = getAuthUserLabel(user)
          document.cookie = serializeAuthUserLabelCookie(userLabel)

          const avatarUrl = getProfileImageUrl(user)
          if (avatarUrl) {
            document.cookie = serializeAuthUserAvatarCookie(avatarUrl)
          } else {
            document.cookie = clearAuthUserAvatarCookie()
          }
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
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("access_token")
            window.localStorage.removeItem("refresh_token")
            window.localStorage.removeItem("auth_user")
            document.cookie = clearAuthSessionCookie()
            document.cookie = clearAuthUserLabelCookie()
            document.cookie = clearAuthUserAvatarCookie()
          }

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
  }, [apiUrl, retryKey, router])

  function setDraftField<K extends keyof ProfileUpdatePayload>(
    field: K,
    value: ProfileUpdatePayload[K],
  ) {
    setDraft((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        [field]: value,
      }
    })
  }

  async function saveProfileChanges() {
    if (!draft || !profile) {
      return
    }

    const session = buildSessionState()
    if (!session) {
      router.replace("/sign-in")
      return
    }

    setSaving(true)
    setError("")

    try {
      const payload: ProfileUpdatePayload = {
        name: draft.name.trim(),
        user_name: draft.user_name.trim(),
        email: draft.email.trim(),
        phone_no: draft.phone_no.trim(),
        date_of_birth: draft.date_of_birth?.trim() || undefined,
        gender: draft.gender.trim(),
        bio: draft.bio?.trim() || undefined,
        role: draft.role || profile.role || "user",
        status: draft.status || profile.status || "active",
        profile_pic_id: draft.profile_pic_id ?? undefined,
      }

      if (
        !payload.name ||
        !payload.user_name ||
        !payload.email ||
        !payload.phone_no ||
        !payload.gender ||
        !payload.role ||
        !payload.status
      ) {
        throw new Error("Please complete all required profile fields before saving.")
      }

      await updateProfile({
        apiUrl,
        accessToken: session.accessToken,
        userId: session.userId,
        payload,
      })

      const refreshed = await fetchProfile({
        apiUrl,
        userId: session.userId,
        accessToken: session.accessToken,
      })

      setProfile(refreshed)
      setDraft(createDraftFromProfile(refreshed))
      setAvatarPreviewUrl(getProfileImageUrl(refreshed))
      setIsEditing(false)
      toast.success("Profile updated successfully.")

      if (typeof window !== "undefined") {
        window.localStorage.setItem("auth_user", JSON.stringify(refreshed))

        const userLabel = getAuthUserLabel(refreshed)
        document.cookie = serializeAuthUserLabelCookie(userLabel)

        const avatarUrl = getProfileImageUrl(refreshed)
        if (avatarUrl) {
          document.cookie = serializeAuthUserAvatarCookie(avatarUrl)
        } else {
          document.cookie = clearAuthUserAvatarCookie()
        }
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save profile changes right now."

      if (
        message.toLowerCase().includes("session expired") ||
        message.toLowerCase().includes("unauthorized")
      ) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("access_token")
          window.localStorage.removeItem("refresh_token")
          window.localStorage.removeItem("auth_user")
          document.cookie = clearAuthSessionCookie()
          document.cookie = clearAuthUserLabelCookie()
          document.cookie = clearAuthUserAvatarCookie()
        }

        router.replace("/sign-in")
        return
      }

      setError(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleProfilePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    setError("")
    const selectedFile = event.currentTarget.files?.[0]
    event.currentTarget.value = ""

    if (!selectedFile) {
      return
    }

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please choose an image file for your profile picture.")
      return
    }

    setUploadingPicture(true)

    try {
      const session = buildSessionState()
      if (!session) {
        router.replace("/sign-in")
        return
      }

      const fileRecord = await uploadProfileFile({
        apiUrl,
        accessToken: session.accessToken,
        file: selectedFile,
      })

      const uploadedUrl = fileRecord.public_url || fileRecord.file_url

      setDraft((current) =>
        current
          ? {
            ...current,
            profile_pic_id: fileRecord.file_id,
          }
          : current,
      )
      setAvatarPreviewUrl(uploadedUrl)
      toast.success(
        "Profile photo uploaded and saved in the backend. Click Save changes to attach it to your profile.",
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the uploaded photo right now.",
      )
    } finally {
      setUploadingPicture(false)
    }
  }

  function resetChanges() {
    if (!profile) {
      return
    }

    setDraft(createDraftFromProfile(profile))
    setAvatarPreviewUrl(getProfileImageUrl(profile))
    setIsEditing(false)
    setError("")
  }

  function startEditing() {
    setError("")
    setIsEditing(true)
  }

  function cancelEditing() {
    resetChanges()
  }

  if (loading) {
    return <EditorSkeleton />
  }

  if (error && !profile) {
    return (
      <div className="space-y-4">
        <EditFeedback
          title="Unable to load profile"
          description={error}
          variant="destructive"
        />
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
            className="rounded-xl"
          >
            Retry
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/sign-in">Sign in again</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!profile || !draft) {
    return null
  }

  const displayName = getProfileDisplayName(profile)
  const currentAvatarUrl = avatarPreviewUrl || getProfileImageUrl(profile)
  const role = humanizeStatus(draft.role)
  const status = humanizeStatus(draft.status)
  const statusVariant = getStatusBadgeVariant(draft.status)
  const genderLabel = draft.gender
    ? GENDER_OPTIONS.find((option) => option.value === draft.gender)?.label ?? humanizeStatus(draft.gender)
    : "Not available"
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
      {error ? (
        <EditFeedback
          title="Action failed"
          description={error}
          variant="destructive"
        />
      ) : null}

      <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

              <div className="relative h-24 w-24 shrink-0 rounded-full">
                <Avatar className="h-full w-full ring-4 ring-white shadow-xl dark:ring-slate-950">
                  {currentAvatarUrl ? (
                    <AvatarImage src={currentAvatarUrl} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="bg-slate-900 text-xl font-semibold text-white dark:bg-white dark:text-slate-900">
                    {getAuthInitials(displayName)}
                  </AvatarFallback>
                </Avatar>

                {isEditing ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePhotoSelect}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Upload profile photo"
                      className="absolute bottom-px right-px z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-400 bg-slate-500 text-white shadow-lg shadow-black/20 transition hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-white/80 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Professional profile editor
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                    {displayName}
                  </h1>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    @{draft.user_name || "username"} - {draft.email}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {role}
                  </Badge>
                  <Badge variant={statusVariant} className="rounded-full px-3 py-1">
                    {status}
                  </Badge>
                  <Badge
                    variant={profile.is_email_verified ? "secondary" : "destructive"}
                    className="rounded-full px-3 py-1"
                  >
                    {profile.is_email_verified ? "Verified" : "Unverified"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    Notifications {profile.is_enable_notifications ? "On" : "Off"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {!isEditing ? (
                <Button
                  type="button"
                  onClick={startEditing}
                  className="rounded-xl"
                >
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEditing}
                    className="rounded-xl"
                    disabled={saving || uploadingPicture}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={saveProfileChanges}
                    className="rounded-xl"
                    disabled={saving || uploadingPicture}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Likes"
          value={profile.likes ?? 0}
          description="Community engagements tied to the account."
        />
        <MetricCard
          label="Favorites"
          value={profile.faves ?? 0}
          description="Saved items and preferences currently tracked."
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
            <CardTitle className="text-lg">
              {isEditing ? "Edit profile" : "Profile details"}
            </CardTitle>
            <CardDescription>
              {isEditing
                ? "Update your public identity, contact details, and profile text."
                : "Review your public identity, contact details, and profile text."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!isEditing ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <DataRow label="Full name" value={draft.name} />
                <DataRow label="Username" value={draft.user_name} />
                <DataRow label="Phone number" value={draft.phone_no} />
                <DataRow label="Email address" value={draft.email} />
                <DataRow
                  label="Date of birth"
                  value={draft.date_of_birth ? formatDate(draft.date_of_birth) : "Not available"}
                />
                <DataRow label="Gender" value={genderLabel} />
                <DataRow label="Bio" value={draft.bio || "Not available"} />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Full name
                    </span>
                    <Input
                      value={draft.name}
                      onChange={(event) => setDraftField("name", event.target.value)}
                      placeholder="Your legal or preferred full name"
                    />
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Username
                    </span>
                    <Input
                      value={draft.user_name}
                      onChange={(event) => setDraftField("user_name", event.target.value)}
                      placeholder="username"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Phone number
                    </span>
                    <Input
                      value={draft.phone_no}
                      onChange={(event) => setDraftField("phone_no", event.target.value)}
                      placeholder="+8801XXXXXXXXX"
                    />
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Email address
                    </span>
                    <Input
                      type="email"
                      value={draft.email}
                      disabled
                      className="opacity-80"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Email is managed separately for account security.
                    </p>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Date of birth
                    </span>
                    <Input
                      type="date"
                      value={draft.date_of_birth ?? ""}
                      onChange={(event) =>
                        setDraftField("date_of_birth", event.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="space-y-2 sm:max-w-xs">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Gender
                    </span>
                    <select
                      value={draft.gender}
                      onChange={(event) => setDraftField("gender", event.target.value)}
                      className="h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
                    >
                      <option value="">Select gender</option>
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Bio
                  </span>
                  <Textarea
                    rows={5}
                    value={draft.bio ?? ""}
                    onChange={(event) => setDraftField("bio", event.target.value)}
                    placeholder="Add a short professional summary"
                  />
                </label>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-5">
          <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <CardHeader>
              <CardTitle className="text-lg">Account snapshot</CardTitle>
              <CardDescription>
                Read-only metadata coming from the backend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <DataRow label="Role" value={humanizeStatus(profile.role)} />
              <DataRow label="Status" value={humanizeStatus(profile.status)} />
              <DataRow
                label="Email verification"
                value={profile.is_email_verified ? "Verified" : "Not verified"}
              />
              <DataRow
                label="Notifications"
                value={profile.is_enable_notifications ? "Enabled" : "Disabled"}
              />
              <DataRow label="Last seen" value={formatDate(profile.last_seen_at)} />
              <DataRow label="Joined" value={formatDate(profile.created_at)} />
              <DataRow label="Updated" value={formatDate(profile.updated_at)} />
            </CardContent>
          </Card>

          <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <CardHeader>
              <CardTitle className="text-lg">Location</CardTitle>
              <CardDescription>
                Current location snapshot from the backend profile record.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {locationSummary ? (
                <div className="flex flex-wrap gap-2 pb-1">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {locationSummary}
                  </Badge>
                </div>
              ) : null}
              <DataRow label="Area" value={profile.location?.area} />
              <DataRow label="City" value={profile.location?.city} />
              <DataRow label="State" value={profile.location?.state} />
              <DataRow label="Country" value={profile.location?.country} />
              <DataRow
                label="Latitude"
                value={
                  typeof profile.location?.latitude === "number"
                    ? profile.location.latitude.toFixed(6)
                    : null
                }
              />
              <DataRow
                label="Longitude"
                value={
                  typeof profile.location?.longitude === "number"
                    ? profile.location.longitude.toFixed(6)
                    : null
                }
              />
            </CardContent>
          </Card>

        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {isEditing ? (
          <Button
            type="button"
            variant="outline"
            onClick={cancelEditing}
            className="rounded-xl"
            disabled={saving || uploadingPicture}
          >
            Cancel
          </Button>
        ) : null}
        {isEditing ? (
          <Button
            type="button"
            onClick={saveProfileChanges}
            className="rounded-xl"
            disabled={saving || uploadingPicture}
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={startEditing}
            className="rounded-xl"
          >
            Edit Profile
          </Button>
        )}
        <Button asChild variant="ghost" className="rounded-xl">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}
