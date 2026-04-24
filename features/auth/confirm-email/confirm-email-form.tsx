"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Mail, RotateCcw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { confirmEmailCode, requestConfirmEmailCode } from "./confirm-email.service"

type ConfirmEmailFormProps = {
  apiUrl: string
}

type ConfirmStep = "request" | "verify"

const steps: Array<{ key: ConfirmStep; title: string; description: string }> = [
  {
    key: "request",
    title: "Email",
    description: "Send or resend the code",
  },
  {
    key: "verify",
    title: "Code",
    description: "Confirm the email address",
  },
]

function StepIndicator({ activeStep }: { activeStep: ConfirmStep }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {steps.map((step, index) => {
        const isActive = step.key === activeStep
        const isComplete = steps.findIndex((item) => item.key === activeStep) > index

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

export function ConfirmEmailForm({ apiUrl }: ConfirmEmailFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get("email") ?? ""

  const [step, setStep] = useState<ConfirmStep>(initialEmail ? "verify" : "request")
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState("")
  const [requesting, setRequesting] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const stepMeta = useMemo(
    () => steps.find((item) => item.key === step) ?? steps[0],
    [step],
  )

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRequesting(true)

    try {
      await requestConfirmEmailCode({ apiUrl, email })
      toast.success("If the account exists, a verification email has been sent.")
      setStep("verify")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to request a verification code right now.",
      )
    } finally {
      setRequesting(false)
    }
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setVerifying(true)

    try {
      await confirmEmailCode({ apiUrl, email, code })
      toast.success("Email verified successfully. You can sign in now.")
      router.push("/sign-in")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to verify the email right now.",
      )
    } finally {
      setVerifying(false)
    }
  }

  async function resendCode() {
    setRequesting(true)

    try {
      await requestConfirmEmailCode({ apiUrl, email })
      toast.success("A new verification email has been sent.")
      setStep("verify")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to resend the verification email right now.",
      )
    } finally {
      setRequesting(false)
    }
  }

  return (
    <section className="flex items-center">
      <div className="w-full rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Verification flow
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Confirm email</h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            {stepMeta.description}. We will keep the flow on one screen and let
            you resend the code if it expires.
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
              {requesting ? "Sending code..." : "Send verification code"}
            </Button>

            <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
              We will use this email to find the account and send a fresh code.
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
                {verifying ? "Verifying..." : "Verify email"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("request")}
                className="rounded-xl"
              >
                Change email
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resendCode}
                className="rounded-xl"
                disabled={requesting}
              >
                <RotateCcw className="h-4 w-4" />
                {requesting ? "Resending..." : "Resend code"}
              </Button>
            </div>
          </form>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Need a password reset instead?{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-slate-900 underline underline-offset-4 transition hover:text-primary dark:text-slate-100"
          >
            Forgot password
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-300">
          Already verified?{" "}
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
