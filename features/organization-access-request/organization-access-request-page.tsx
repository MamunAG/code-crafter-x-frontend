"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Loader2, LogOut } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { parseStoredAuthUser, clearAuthSessionCookie, clearAuthUserAvatarCookie, clearAuthUserLabelCookie, clearStoredAuthSession } from "@/lib/auth-session"

import { createOrganizationAccessRequest } from "./organization-access-request.service"
import type { OrganizationAccessRequestFormValues } from "./organization-access-request.types"

const DEFAULT_FORM_VALUES: OrganizationAccessRequestFormValues = {
  adminEmail: "",
  message: "",
}

export function OrganizationAccessRequestPage() {
  const router = useRouter()

  const [formValues, setFormValues] = useState<OrganizationAccessRequestFormValues>(DEFAULT_FORM_VALUES)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleLogout() {
    clearStoredAuthSession()
    document.cookie = clearAuthSessionCookie()
    document.cookie = clearAuthUserLabelCookie()
    document.cookie = clearAuthUserAvatarCookie()
    router.replace("/sign-in")
  }

  async function handleSubmit() {
    const accessToken = window.localStorage.getItem("access_token")
    const storedUser = parseStoredAuthUser(window.localStorage.getItem("auth_user"))
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

    if (!accessToken || !storedUser?.id) {
      toast.error("Please sign in again to submit an access request.")
      return
    }

    if (
      storedUser.email &&
      storedUser.email.trim().toLowerCase() === formValues.adminEmail.trim().toLowerCase()
    ) {
      toast.error("You cannot send an access request to your own account. Please choose another admin email.")
      return
    }

    if (!formValues.adminEmail.trim()) {
      toast.error("Please enter an admin email.")
      return
    }

    setIsSubmitting(true)

    try {
      await createOrganizationAccessRequest({
        apiUrl,
        accessToken,
        payload: formValues,
      })

      toast.success("Your access request has been sent to the selected admin.")
      router.replace("/")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit the access request right now."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_#eff6ff_0%,_#f8fafc_48%,_#ffffff_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#111827_48%,_#020617_100%)] dark:text-slate-100">
      <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col px-3 py-4 sm:px-4 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Organization access
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Request access from an organization admin
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              If you do not want to create a new organization, send a request to an admin email
              and that admin will review it in IAM.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-200"
          >
            <LogOut className="size-3.5" />
            Logout
          </Button>
        </div>

        <Card className="mt-6 border-slate-200/80 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">
              Submit access request
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Enter the admin email, add an optional note, and the admin will review it in IAM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Admin email
              </label>
              <Input
                type="email"
                value={formValues.adminEmail}
                onChange={(event) =>
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    adminEmail: event.target.value,
                  }))
                }
                placeholder="admin@example.com"
                disabled={isSubmitting}
              />
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                The request will be sent to this admin&apos;s email and shown in their IAM queue.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Message
              </label>
              <Textarea
                value={formValues.message}
                onChange={(event) =>
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    message: event.target.value,
                  }))
                }
                placeholder="Tell the admin why you need access"
                className="min-h-24"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-10 rounded-xl px-5 text-sm font-medium"
              >
                {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Send request
              </Button>
              <Button
                asChild
                type="button"
                variant="outline"
                className="h-10 rounded-xl px-5 text-sm font-medium"
              >
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
