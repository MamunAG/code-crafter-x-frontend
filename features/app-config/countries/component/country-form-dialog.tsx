"use client"

import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Controller, useForm, type FieldErrors } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useIsMobile } from "@/hooks/use-mobile"

import type { CountryFormValues } from "../country.types"

type CountryEditorMode = "create" | "edit"

type CountryFormDialogProps = {
  open: boolean
  mode: CountryEditorMode
  loading: boolean
  submitting: boolean
  error: string
  initialValues: CountryFormValues
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CountryFormValues) => void | Promise<void>
}

type CountryFieldName = keyof CountryFormValues

const COUNTRY_FIELD_ORDER: CountryFieldName[] = ["name", "isActive"]
const countryFormSchema = z.object({
  name: z.string().trim().min(1, "Country name is required."),
  isActive: z.boolean(),
})

function getErrorMessage(error: unknown) {
  if (typeof error === "string") return error
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string") return message
  }
  return ""
}

function buildValidationSummary(errors: FieldErrors<CountryFormValues>) {
  return COUNTRY_FIELD_ORDER.flatMap((field) => {
    const message = getErrorMessage(errors[field]?.message)
    if (!message) return []
    return [{ field, label: field === "name" ? "Country name" : "Active", message }]
  })
}

function getFirstInvalidField(errors: FieldErrors<CountryFormValues>) {
  return COUNTRY_FIELD_ORDER.find((field) => errors[field]) ?? null
}

function FieldErrorMessage({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">{message}</p>
}

export function CountryFormDialog({
  open,
  mode,
  loading,
  submitting,
  error,
  initialValues,
  onOpenChange,
  onSubmit,
}: CountryFormDialogProps) {
  const title = mode === "create" ? "Create country" : "Edit country"
  const description =
    mode === "create"
      ? "Add an application country reference record."
      : "Update the selected application country reference record."
  const isMobile = useIsMobile()

  const {
    control,
    clearErrors,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
  } = useForm<CountryFormValues>({
    resolver: zodResolver(countryFormSchema),
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  })

  useEffect(() => {
    reset(initialValues)
    clearErrors()
  }, [clearErrors, initialValues, open, reset])

  const validationSummary = useMemo(() => buildValidationSummary(errors), [errors])
  const visibleValidationSummary = isMobile ? validationSummary.slice(0, 3) : validationSummary
  const hiddenValidationCount = validationSummary.length - visibleValidationSummary.length

  function handleInvalidSubmit(formErrors: FieldErrors<CountryFormValues>) {
    const firstInvalidField = getFirstInvalidField(formErrors)
    if (!firstInvalidField) return
    setFocus(firstInvalidField)
    window.requestAnimationFrame(() => {
      document.getElementById(`country-field-${firstInvalidField}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl overflow-hidden p-0">
        <form className="flex max-h-[calc(100vh-2rem)] flex-col" onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)}>
          <div className="border-b border-slate-200/70 px-6 pb-4 pt-6 dark:border-white/10">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            {!loading && error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            ) : null}

            {!loading && validationSummary.length > 0 ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                <p className="font-medium">Please fix the following:</p>
                <ul className="mt-1 space-y-1">
                  {visibleValidationSummary.map((entry) => (
                    <li key={entry.field} className="flex gap-2">
                      <span className="shrink-0 font-medium">{entry.label}:</span>
                      <span className="min-w-0 flex-1">{entry.message}</span>
                    </li>
                  ))}
                  {hiddenValidationCount > 0 ? <li className="font-medium">+{hiddenValidationCount} more</li> : null}
                </ul>
              </div>
            ) : null}
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-6 py-5">
              {loading ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-7 w-full rounded-md" />
                  <Skeleton className="h-7 w-28 rounded-md" />
                </div>
              ) : (
                <>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <div id="country-field-name" className="space-y-1.5">
                        <label htmlFor={field.name} className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Country name <span className="text-red-500">*</span>
                        </label>
                        <Input {...field} id={field.name} ref={field.ref} required placeholder="Input country name" aria-invalid={Boolean(errors.name)} />
                        <FieldErrorMessage message={getErrorMessage(errors.name?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <div id="country-field-isActive" className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-slate-50/70 px-3 py-3 dark:border-white/5 dark:bg-white/[0.03]">
                        <div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Active</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Active countries are available across app configuration flows.
                          </p>
                        </div>
                        <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} onBlur={field.onBlur} />
                      </div>
                    )}
                  />
                </>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-slate-200/70 px-6 py-4 dark:border-white/10">
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || submitting} className="rounded-xl">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {mode === "create" ? "Save country" : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
