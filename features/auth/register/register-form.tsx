"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { DEFAULT_GENDER_OPTIONS } from "./register.constants"
import { GenderCombobox } from "./gender-combobox"
import { fetchGenderOptions, registerUser } from "./register.service"
import type { GenderOption, RegisterFormValues } from "./register.types"

type RegisterFormProps = {
  apiUrl: string
}

const initialValues: RegisterFormValues = {
  name: "",
  email: "",
  phone_no: "",
  user_name: "",
  password: "",
  date_of_birth: "",
  gender: "",
  bio: "",
}

export function RegisterForm({ apiUrl }: RegisterFormProps) {
  const router = useRouter()
  const [values, setValues] = useState<RegisterFormValues>(initialValues)
  const [loading, setLoading] = useState(false)
  const [genderLoading, setGenderLoading] = useState(true)
  const [genderOptions, setGenderOptions] = useState<GenderOption[]>(
    DEFAULT_GENDER_OPTIONS,
  )
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  function updateField<K extends keyof RegisterFormValues>(
    field: K,
    value: RegisterFormValues[K],
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")
    let shouldRedirect = false

    try {
      const payload = await registerUser({ apiUrl, values })
      setMessage(payload.message || "Registration successful")
      setValues(initialValues)
      router.push(`/confirm-email?email=${encodeURIComponent(values.email)}`)
      shouldRedirect = true
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed")
    } finally {
      if (!shouldRedirect) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    let isActive = true

    async function loadGenderOptions() {
      setGenderLoading(true)

      try {
        const options = await fetchGenderOptions(apiUrl)
        if (isActive) {
          setGenderOptions(options)
        }
      } catch {
        if (isActive) {
          setGenderOptions(DEFAULT_GENDER_OPTIONS)
        }
      } finally {
        if (isActive) {
          setGenderLoading(false)
        }
      }
    }

    void loadGenderOptions()

    return () => {
      isActive = false
    }
  }, [apiUrl])

  return (
    <section className="flex items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-8"
      >
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Account setup
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Register</h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Fill in your profile details.
          </p>
        </div>

        <div className="mt-8 grid gap-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Name
            </span>
            <input
              type="text"
              name="name"
              value={values.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="John Doe"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
              required
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
              </span>
              <input
                type="email"
                name="email"
                value={values.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="name@company.com"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Phone
              </span>
              <input
                type="tel"
                name="phone_no"
                value={values.phone_no}
                onChange={(event) => updateField("phone_no", event.target.value)}
                placeholder="+8801XXXXXXXXX"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
                required
              />
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Username
              </span>
              <input
                type="text"
                name="user_name"
                value={values.user_name}
                onChange={(event) => updateField("user_name", event.target.value)}
                placeholder="john_doe"
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
                value={values.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="Create a password"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
                required
                minLength={6}
              />
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Gender
              </span>
              <GenderCombobox
                name="gender"
                value={values.gender}
                options={genderOptions}
                loading={genderLoading}
                onChange={(nextValue) => updateField("gender", nextValue)}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Date of birth
              </span>
              <input
                type="date"
                name="date_of_birth"
                value={values.date_of_birth}
                onChange={(event) => updateField("date_of_birth", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-white/20 dark:focus:ring-white/10"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Bio
            </span>
            <textarea
              name="bio"
              rows={4}
              value={values.bio}
              onChange={(event) => updateField("bio", event.target.value)}
              placeholder="Short profile note"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
            />
          </label>
        </div>

        <Button
          type="submit"
          className="mt-6 h-11 w-full rounded-xl text-sm font-medium"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>

        <p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-300">
          Already have an account?{" "}
          <Link
            href="/"
            className="font-medium text-slate-900 underline underline-offset-4 transition hover:text-primary dark:text-slate-100"
          >
            Sign in
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
          </div>
        ) : null}
      </form>
    </section>
  )
}
