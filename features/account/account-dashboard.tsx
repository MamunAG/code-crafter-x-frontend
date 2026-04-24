"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  ChevronRight,
  CreditCard,
  FileText,
  HelpCircle,
  LockKeyhole,
  LogOut,
  MailCheck,
  MapPin,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react"

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
import { Switch } from "@/components/ui/switch"
import {
  clearAuthSessionCookie,
  clearAuthUserAvatarCookie,
  clearAuthUserLabelCookie,
  getAuthInitials,
  getAuthUserLabel,
  parseStoredAuthUser,
} from "@/lib/auth-session"
import type { BackendProfileUser } from "@/features/profile/profile.types"

type AccountOption = {
  title: string
  description: string
  href: string
  icon: ComponentType<{ className?: string }>
  status?: string
}

const accountOptions: AccountOption[] = [
  {
    title: "Profile",
    description: "Public identity, avatar, contact details, and bio.",
    href: "/profile",
    icon: UserRoundCog,
    status: "Editable",
  },
  {
    title: "Security",
    description: "Password, recovery email, and active session controls.",
    href: "/account/security",
    icon: LockKeyhole,
    status: "Protected",
  },
  {
    title: "Billing",
    description: "Plan, payment method, invoices, and billing contacts.",
    href: "/profile",
    icon: CreditCard,
    status: "Standard",
  },
  {
    title: "Support",
    description: "Help requests, product questions, and account assistance.",
    href: "/",
    icon: HelpCircle,
    status: "Available",
  },
]

function humanizeStatus(value?: string | null) {
  if (!value) {
    return "Unknown"
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
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

function DetailRow({
  label,
  value,
}: {
  label: string
  value?: string | number | null
}) {
  const displayValue = value === "" || value == null ? "Not available" : value

  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 py-3 last:border-b-0 dark:border-white/10">
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="min-w-0 break-words text-right text-sm font-medium text-slate-950 dark:text-slate-100">
        {displayValue}
      </span>
    </div>
  )
}

function readStoredAccountProfile() {
  if (typeof window === "undefined") {
    return null
  }

  const accessToken = window.localStorage.getItem("access_token")
  const storedUser = parseStoredAuthUser(
    window.localStorage.getItem("auth_user"),
  ) as BackendProfileUser | null

  if (!accessToken || !storedUser?.id) {
    return null
  }

  return storedUser
}

function AccountDashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-3 pb-12 sm:px-4">
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-12">
          <Card className="overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm lg:col-span-8 dark:border-white/10 dark:bg-slate-900">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-4 w-80 max-w-full" />
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-6 w-28 rounded-full" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Skeleton className="h-10 w-28 rounded-md" />
                  <Skeleton className="h-10 w-28 rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm lg:col-span-4 dark:border-white/10 dark:bg-slate-900">
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-px w-full" />
              <Skeleton className="h-12 rounded-lg" />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-12">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm lg:col-span-8 dark:border-white/10 dark:bg-slate-900">
            <CardHeader>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-32 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 lg:col-span-4">
            <Skeleton className="h-52 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg sm:col-span-2 lg:col-span-1" />
        </section>
      </div>
    </div>
  )
}

export function AccountDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<BackendProfileUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      const storedProfile = readStoredAccountProfile()

      if (!storedProfile) {
        router.replace("/sign-in")
        return
      }

      setProfile(storedProfile)
      setIsReady(true)
    })
  }, [router])

  const userLabel = useMemo(() => getAuthUserLabel(profile), [profile])
  const avatarUrl = getProfileImageUrl(profile)
  const email = profile?.email || "Not available"
  const username = profile?.user_name ? `@${profile.user_name}` : "No username"
  const role = humanizeStatus(profile?.role)
  const status = humanizeStatus(profile?.status)
  const locationSummary = [
    profile?.location?.area,
    profile?.location?.city,
    profile?.location?.state,
    profile?.location?.country,
  ]
    .filter(Boolean)
    .join(", ")

  function handleLogout() {
    window.localStorage.removeItem("access_token")
    window.localStorage.removeItem("refresh_token")
    window.localStorage.removeItem("auth_user")
    document.cookie = clearAuthSessionCookie()
    document.cookie = clearAuthUserLabelCookie()
    document.cookie = clearAuthUserAvatarCookie()
    router.replace("/sign-in")
  }

  if (!isReady || !profile) {
    return <AccountDashboardSkeleton />
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-3 pb-12 sm:px-4">
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-12">
          <Card className="overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm lg:col-span-8 dark:border-white/10 dark:bg-slate-900">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <Avatar className="h-20 w-20 ring-4 ring-slate-100 dark:ring-slate-800">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={userLabel} />
                    ) : null}
                    <AvatarFallback className="bg-slate-950 text-lg font-semibold text-white dark:bg-white dark:text-slate-950">
                      {getAuthInitials(userLabel)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Account
                      </p>
                      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                        {userLabel}
                      </h1>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {username} - {email}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full px-3 py-1">
                        {role}
                      </Badge>
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        {status}
                      </Badge>
                      <Badge
                        variant={
                          profile?.is_email_verified ? "secondary" : "destructive"
                        }
                        className="rounded-full px-3 py-1"
                      >
                        {profile?.is_email_verified
                          ? "Email verified"
                          : "Email unverified"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild className="rounded-md">
                    <Link href="/profile">Edit profile</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLogout}
                    className="rounded-md"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm lg:col-span-4 dark:border-white/10 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-lg">Account health</CardTitle>
              <CardDescription>Verification and access signals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Session</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Signed in
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full">
                  Active
                </Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                    <MailCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Email</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {email}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={profile?.is_email_verified ? "secondary" : "destructive"}
                  className="rounded-full"
                >
                  {profile?.is_email_verified ? "Verified" : "Check"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-12">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm lg:col-span-8 dark:border-white/10 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-lg">Options</CardTitle>
              <CardDescription>
                Account areas available from this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {accountOptions.map((option) => {
                  const Icon = option.icon

                  return (
                    <Link
                      key={option.title}
                      href={option.href}
                      className="group flex min-h-32 items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white hover:shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                    >
                      <div className="flex gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-white/10">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">
                              {option.title}
                            </p>
                            {option.status ? (
                              <Badge
                                variant="outline"
                                className="rounded-full px-2 py-0 text-[11px]"
                              >
                                {option.status}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {option.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 lg:col-span-4">
            <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-lg">Preferences</CardTitle>
                <CardDescription>
                  Current account communication settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                      <Bell className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">Notifications</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {profile?.is_enable_notifications ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={Boolean(profile?.is_enable_notifications)}
                    disabled
                    aria-label="Notification preference"
                  />
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {locationSummary || "Not available"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
                <CardDescription>Backend account metadata.</CardDescription>
              </CardHeader>
              <CardContent>
                <DetailRow label="Role" value={role} />
                <DetailRow label="Status" value={status} />
                <DetailRow label="Last seen" value={formatDate(profile?.last_seen_at)} />
                <DetailRow label="Joined" value={formatDate(profile?.created_at)} />
                <DetailRow label="Updated" value={formatDate(profile?.updated_at)} />
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
            <CardContent className="flex items-center gap-3 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium">Terms</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Workspace policy documents
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
            <CardContent className="flex items-center gap-3 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium">Privacy</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Account data and permissions
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm sm:col-span-2 lg:col-span-1 dark:border-white/10 dark:bg-slate-900">
            <CardContent className="flex items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-medium">Need a clean exit?</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  End this browser session securely.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleLogout}
                className="rounded-md"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
