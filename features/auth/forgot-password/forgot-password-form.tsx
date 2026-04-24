"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, KeyRound, Mail, RotateCcw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import {
  requestResetCode,
  resetPassword,
  verifyResetCode,
} from "./forgot-password.service"

type ForgotPasswordFormProps = {
  apiUrl: string
}

type RecoveryStep = "request" | "verify" | "reset"

const steps: Array<{ key: RecoveryStep; title: string; description: string }> = [
  {
    key: "request",
    title: "Email",
    description: "Send a verification code",
  },
  {
    key: "verify",
    title: "Code",
    description: "Confirm the code",
  },
  {
    key: "reset",
    title: "Password",
    description: "Set a new password",
  },
]

function StepIndicator({
  activeStep,
}: {
  activeStep: RecoveryStep
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {steps.map((step, index) => {
        const isActive = step.key === activeStep
        const isComplete =
          steps.findIndex((item) => item.key === activeStep) > index

        return (
          <div
            key={step.key}
            className={cn(
              "rounded-2xl border px-4 py-3 transition",
              isActive
                ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                : isComplete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                  : "border-slate-200 bg-white/70 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-semibold",
                  isActive
                    ? "bg-white text-slate-950 dark:bg-slate-950 dark:text-white"
                    : isComplete
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200",
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs leading-5">{step.description}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function ForgotPasswordForm({ apiUrl }: ForgotPasswordFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<RecoveryStep>("request")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [requesting, setRequesting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resetting, setResetting] = useState(false)

  const stepMeta = useMemo(
    () => steps.find((item) => item.key === step) ?? steps[0],
    [step],
  )

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRequesting(true)

    try {
      await requestResetCode({ apiUrl, email })
      toast.success("If the account exists, a reset code has been sent.")
      setStep("verify")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to request a reset code right now.",
      )
    } finally {
      setRequesting(false)
    }
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setVerifying(true)

    try {
      await verifyResetCode({ apiUrl, email, code })
      toast.success("Code verified. You can now choose a new password.")
      setStep("reset")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to verify the reset code right now.",
      )
    } finally {
      setVerifying(false)
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.")
      return
    }

    setResetting(true)

    try {
      await resetPassword({
        apiUrl,
        email,
        code,
        newPassword,
        confirmPassword,
      })

      toast.success("Password updated successfully. You can sign in again.")
      setEmail("")
      setCode("")
      setNewPassword("")
      setConfirmPassword("")
      router.push("/sign-in")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to reset the password right now.",
      )
    } finally {
      setResetting(false)
    }
  }

  return (
    <section className="flex items-center">
      <div className="w-full rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Recovery flow
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Forgot password</h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            {stepMeta.description}. We will guide you through the reset in one
            screen.
          </p>
        </div>

        <div className="mt-6">
          <StepIndicator activeStep={step} />
        </div>

        {step === "request" ? (
          <form onSubmit={handleRequestCode} className="mt-8 space-y-5">
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
                placeholder="name@company.com"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
                required
              />
            </label>

            <Button
              type="submit"
              className="h-11 w-full rounded-xl text-sm font-medium"
              disabled={requesting}
            >
              <Mail className="h-4 w-4" />
              {requesting ? "Sending code..." : "Send reset code"}
            </Button>

            <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
              Use the email on your account or the recovery email if one is set.
            </p>
          </form>
        ) : null}

        {step === "verify" ? (
          <form onSubmit={handleVerifyCode} className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Verification code
                </span>
                <input
                  type="text"
                  name="code"
                  inputMode="numeric"
                  maxLength={4}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="1234"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
                  required
                />
              </label>

              <Button
                type="submit"
                variant="outline"
                className="h-11 rounded-xl px-5 text-sm font-medium"
                disabled={verifying}
              >
                <ShieldCheck className="h-4 w-4" />
                {verifying ? "Verifying..." : "Verify code"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("request")}
                className="rounded-xl"
              >
                <ArrowLeft className="h-4 w-4" />
                Change email
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  setRequesting(true)
                  try {
                    await requestResetCode({ apiUrl, email })
                    toast.success("A new reset code has been sent.")
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Unable to resend the reset code right now.",
                    )
                  } finally {
                    setRequesting(false)
                  }
                }}
                className="rounded-xl"
                disabled={requesting}
              >
                <RotateCcw className="h-4 w-4" />
                {requesting ? "Resending..." : "Resend code"}
              </Button>
            </div>
          </form>
        ) : null}

        {step === "reset" ? (
          <form onSubmit={handleResetPassword} className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  New password
                </span>
                <input
                  type="password"
                  name="newPassword"
                  autoComplete="new-password"
                  minLength={6}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Create a new password"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Confirm password
                </span>
                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm password"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/10"
                  required
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("verify")}
                className="rounded-xl"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to code
              </Button>

              <Button
                type="submit"
                className="h-11 rounded-xl px-5 text-sm font-medium"
                disabled={resetting}
              >
                <KeyRound className="h-4 w-4" />
                {resetting ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Remembered your password?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-slate-900 underline underline-offset-4 transition hover:text-primary dark:text-slate-100"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </section>
  )
}
