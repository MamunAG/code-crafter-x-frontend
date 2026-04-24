"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  KeyRound,
  LifeBuoy,
  LogOut,
  Mail,
  ShieldCheck,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  clearAuthSessionCookie,
  clearAuthUserAvatarCookie,
  clearAuthUserLabelCookie,
  getAuthUserLabel,
  parseStoredAuthUser,
} from "@/lib/auth-session"
import { fetchProfile } from "@/features/profile/profile.service"
import type { BackendProfileUser } from "@/features/profile/profile.types"

import {
  requestPasswordReset,
  resetPassword,
  updateRecoveryEmail,
  verifyResetCode,
} from "./security.service"

type SecuritySettingsProps = {
  apiUrl: string
}

type SessionState = {
  accessToken: string
  userId: string
}

function buildSessionState(): SessionState | null {
  if (typeof window === "undefined") {
    return null
  }

  const accessToken = window.localStorage.getItem("access_token")
  const storedUser = parseStoredAuthUser(window.localStorage.getItem("auth_user"))

  if (!accessToken || !storedUser?.id) {
    return null
  }

  return {
    accessToken,
    userId: storedUser.id,
  }
}

function isSessionError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes("session")
}

function SecuritySettingsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-12 sm:px-4">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>

        <section className="grid gap-4 lg:grid-cols-12">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm lg:col-span-5 dark:border-white/10 dark:bg-slate-900">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 rounded-md" />
              <Skeleton className="h-10 w-44 rounded-md" />
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm lg:col-span-7 dark:border-white/10 dark:bg-slate-900">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 rounded-md" />
                </div>
                <Skeleton className="h-10 w-28 rounded-md" />
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 rounded-md" />
                </div>
                <Skeleton className="h-10 w-24 rounded-md" />
              </div>
              <Skeleton className="h-px w-full" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-16 rounded-md" />
                <Skeleton className="h-16 rounded-md" />
              </div>
              <Skeleton className="h-10 w-40 rounded-md" />
            </CardContent>
          </Card>
        </section>

        <Skeleton className="h-24 rounded-lg" />
      </div>
    </div>
  )
}

export function SecuritySettings({ apiUrl }: SecuritySettingsProps) {
  const router = useRouter()
  const [session, setSession] = useState<SessionState | null>(null)
  const [profile, setProfile] = useState<BackendProfileUser | null>(null)
  const [recoveryEmail, setRecoveryEmail] = useState("")
  const [resetEmail, setResetEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [savingRecovery, setSavingRecovery] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)

  const userLabel = useMemo(() => getAuthUserLabel(profile), [profile])

  useEffect(() => {
    queueMicrotask(() => {
      const nextSession = buildSessionState()

      if (!nextSession) {
        router.replace("/sign-in")
        return
      }

      setSession(nextSession)

      fetchProfile({
        apiUrl,
        userId: nextSession.userId,
        accessToken: nextSession.accessToken,
      })
        .then((nextProfile) => {
          const preferredResetEmail =
            nextProfile.recovery_email || nextProfile.email || ""

          setProfile(nextProfile)
          setRecoveryEmail(nextProfile.recovery_email || "")
          setResetEmail(preferredResetEmail)
          window.localStorage.setItem("auth_user", JSON.stringify(nextProfile))
        })
        .catch((error: unknown) => {
          if (isSessionError(error)) {
            clearSession()
            router.replace("/sign-in")
            return
          }

          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load security settings right now.",
          )
        })
        .finally(() => {
          setLoading(false)
        })
    })
  }, [apiUrl, router])

  function clearSession() {
    window.localStorage.removeItem("access_token")
    window.localStorage.removeItem("refresh_token")
    window.localStorage.removeItem("auth_user")
    document.cookie = clearAuthSessionCookie()
    document.cookie = clearAuthUserLabelCookie()
    document.cookie = clearAuthUserAvatarCookie()
  }

  function handleLogout() {
    clearSession()
    router.replace("/sign-in")
  }

  async function handleRecoverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!session) {
      router.replace("/sign-in")
      return
    }

    setSavingRecovery(true)

    try {
      const updatedProfile = await updateRecoveryEmail({
        apiUrl,
        accessToken: session.accessToken,
        userId: session.userId,
        recoveryEmail,
      })

      setProfile(updatedProfile)
      setRecoveryEmail(updatedProfile.recovery_email || "")
      setResetEmail(updatedProfile.recovery_email || updatedProfile.email || "")
      window.localStorage.setItem("auth_user", JSON.stringify(updatedProfile))
      toast.success("Recovery email updated successfully.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update recovery email right now.",
      )
    } finally {
      setSavingRecovery(false)
    }
  }

  async function handleSendCode() {
    setSendingCode(true)
    setCodeVerified(false)

    try {
      await requestPasswordReset({ apiUrl, email: resetEmail })
      toast.success("Verification code sent to the selected email.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to send password reset code right now.",
      )
    } finally {
      setSendingCode(false)
    }
  }

  async function handleVerifyCode() {
    setVerifyingCode(true)

    try {
      await verifyResetCode({ apiUrl, email: resetEmail, code })
      setCodeVerified(true)
      toast.success("Code verified. You can set a new password.")
    } catch (error) {
      setCodeVerified(false)
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to verify this code right now.",
      )
    } finally {
      setVerifyingCode(false)
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.")
      return
    }

    setResettingPassword(true)

    try {
      await resetPassword({
        apiUrl,
        email: resetEmail,
        code,
        newPassword,
        confirmPassword,
      })

      setCode("")
      setNewPassword("")
      setConfirmPassword("")
      setCodeVerified(false)
      toast.success("Password updated successfully.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to reset password right now.",
      )
    } finally {
      setResettingPassword(false)
    }
  }

  if (loading) {
    return <SecuritySettingsSkeleton />
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-12 sm:px-4">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button asChild variant="ghost" className="mb-3 rounded-md px-0">
              <Link href="/account">
                <ArrowLeft className="h-4 w-4" />
                Account
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold tracking-tight">Security</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Password recovery and active browser access for {userLabel}.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
            Protected
          </Badge>
        </div>

        <section className="grid gap-4 lg:grid-cols-12">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm lg:col-span-5 dark:border-white/10 dark:bg-slate-900">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                  <LifeBuoy className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-lg">Recovery email</CardTitle>
                  <CardDescription>Separate destination for password reset codes.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecoverySubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recovery-email">Recovery email</Label>
                  <Input
                    id="recovery-email"
                    name="recovery-email"
                    type="email"
                    value={recoveryEmail}
                    onChange={(event) => setRecoveryEmail(event.target.value)}
                    placeholder="recovery@example.com"
                  />
                </div>
                <Button type="submit" disabled={savingRecovery} className="rounded-md">
                  <Mail className="h-4 w-4" />
                  {savingRecovery ? "Saving..." : "Save recovery email"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm lg:col-span-7 dark:border-white/10 dark:bg-slate-900">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <KeyRound className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-lg">Password reset</CardTitle>
                  <CardDescription>Use an email code before setting a new password.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Reset email</Label>
                    <Input
                      id="reset-email"
                      name="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(event) => {
                        setResetEmail(event.target.value)
                        setCodeVerified(false)
                      }}
                      placeholder={profile?.email || "you@example.com"}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={sendingCode || !resetEmail.trim()}
                    className="rounded-md"
                  >
                    {sendingCode ? "Sending..." : "Send code"}
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="reset-code">Verification code</Label>
                    <Input
                      id="reset-code"
                      name="reset-code"
                      inputMode="numeric"
                      maxLength={4}
                      value={code}
                      onChange={(event) => {
                        setCode(event.target.value)
                        setCodeVerified(false)
                      }}
                      placeholder="1234"
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVerifyCode}
                    disabled={verifyingCode || code.trim().length !== 4 || !resetEmail.trim()}
                    className="rounded-md"
                  >
                    {verifyingCode ? "Checking..." : "Verify"}
                  </Button>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      name="new-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="New password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm password"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={resettingPassword || !codeVerified}
                  className="rounded-md"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {resettingPassword ? "Updating..." : "Update password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium">Current session</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This browser is signed in as {profile?.email || "your account"}.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="w-fit rounded-md"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
