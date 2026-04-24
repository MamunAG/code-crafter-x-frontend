"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { LoginForm } from "./login-form"
import { LoginHero } from "./login-hero"

const AUTH_COOKIE_NAME = "auth_session"

function hasStoredAuth() {
  if (typeof window === "undefined") {
    return false
  }

  const accessToken = window.localStorage.getItem("access_token")
  const refreshToken = window.localStorage.getItem("refresh_token")

  return Boolean(accessToken || refreshToken)
}

function setAuthCookie() {
  document.cookie = `${AUTH_COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
}

export function LoginPage() {
  const router = useRouter()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  useEffect(() => {
    if (!hasStoredAuth()) {
      return
    }

    setAuthCookie()
    router.replace("/")
  }, [router])

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(180deg,_#faf7ff_0%,_#f8fafc_48%,_#ffffff_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.28),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.22),_transparent_28%),linear-gradient(180deg,_#09090b_0%,_#111827_48%,_#020617_100%)] dark:text-slate-100">
      <div className="mx-auto flex min-h-svh w-full max-w-6xl items-center px-6 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <LoginHero apiUrl={apiUrl} />
          <LoginForm apiUrl={apiUrl} />
        </div>
      </div>
    </main>
  )
}
