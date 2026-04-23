"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { loginUser } from "./login.service"
import type { LoggedInUser } from "./login.types"

type LoginFormProps = {
  apiUrl: string
}

export function LoginForm({ apiUrl }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const payload = await loginUser({ apiUrl, email, password })

      const accessToken = payload.data?.access_token
      const refreshToken = payload.data?.refresh_token

      if (typeof window !== "undefined") {
        if (accessToken) {
          window.localStorage.setItem("access_token", accessToken)
        }

        if (refreshToken) {
          window.localStorage.setItem("refresh_token", refreshToken)
        }

        if (payload.data?.user) {
          window.localStorage.setItem("auth_user", JSON.stringify(payload.data.user))
        }
      }

      setLoggedInUser(payload.data?.user ?? null)
      setMessage(payload.message || "Login successful")
      setPassword("")
    } catch (error) {
      const fallback = "Login failed. Please check your credentials."
      setError(error instanceof Error ? error.message : fallback)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-8"
      >
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Welcome back
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">User Login</h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Use your registered email and password to authenticate.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Email
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@blueatlantic.com"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Password
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
              required
              minLength={6}
            />
          </label>
        </div>

        <Button
          type="submit"
          className="mt-6 h-11 w-full rounded-xl text-sm font-medium"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>

        <p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-300">
          Do not have account?{" "}
          <Link
            href="/register"
            className="font-medium text-slate-900 underline underline-offset-4 transition hover:text-primary dark:text-slate-100"
          >
            Register here
          </Link>
        </p>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </p>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <p className="font-medium">{message}</p>
            {loggedInUser ? (
              <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-200/80">
                Signed in as {loggedInUser.email || loggedInUser.name || "user"}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="mt-6 text-xs leading-5 text-slate-500 dark:text-slate-400">
          The backend requires a verified, active account before login succeeds.
        </p>
      </form>
    </section>
  )
}
