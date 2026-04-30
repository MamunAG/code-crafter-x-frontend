"use client"

import { useEffect, useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Controller, useForm, type FieldErrors } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useIsMobile } from "@/hooks/use-mobile"

import type { EmbellishmentFormValues } from "../embellishment.types"

type EmbellishmentEditorMode = "create" | "edit"

type EmbellishmentFormDialogProps = {
  open: boolean
  mode: EmbellishmentEditorMode
  loading: boolean
  submitting: boolean
  error: string
  initialValues: EmbellishmentFormValues
  onOpenChange: (open: boolean) => void
  onSubmit: (values: EmbellishmentFormValues) => void | Promise<void>
}

type EmbellishmentFieldName = keyof EmbellishmentFormValues

type ValidationSummaryEntry = {
  field: EmbellishmentFieldName
  label: string
  message: string
}

const MOBILE_MAX_SUMMARY_ERRORS = 3
const EMBELLISHMENT_FIELD_ORDER: EmbellishmentFieldName[] = [
  "name",
  "remarks",
  "isActive",
]

const embellishmentFormSchema = z.object({
  name: z.string().trim().min(1, "Embellishment name is required."),
  remarks: z.string().transform((value) => value.trim()),
  isActive: z.boolean(),
})

function getErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message

    if (typeof message === "string") {
      return message
    }
  }

  return ""
}

function buildValidationSummary(errors: FieldErrors<EmbellishmentFormValues>) {
  const entries: ValidationSummaryEntry[] = []

  for (const field of EMBELLISHMENT_FIELD_ORDER) {
    const message = getErrorMessage(errors[field]?.message)

    if (!message) {
      continue
    }

    entries.push({
      field,
      label: field === "name" ? "Embellishment name" : field === "remarks" ? "Remarks" : "Active",
      message,
    })
  }

  return entries
}

function getFirstInvalidField(errors: FieldErrors<EmbellishmentFormValues>) {
  for (const field of EMBELLISHMENT_FIELD_ORDER) {
    if (errors[field]) {
      return field
    }
  }

  return null
}

function FieldErrorMessage({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">{message}</p>
}

export function EmbellishmentFormDialog({
  open,
  mode,
  loading,
  submitting,
  error,
  initialValues,
  onOpenChange,
  onSubmit,
}: EmbellishmentFormDialogProps) {
  const title = mode === "create" ? "Create embellishment" : "Edit embellishment"
  const description =
    mode === "create"
      ? "Add a merchandising embellishment master record."
      : "Update the selected merchandising embellishment master record."
  const isMobile = useIsMobile()

  const {
    control,
    clearErrors,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
  } = useForm<EmbellishmentFormValues>({
    resolver: zodResolver(embellishmentFormSchema),
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  })

  useEffect(() => {
    reset(initialValues)
    clearErrors()
  }, [clearErrors, initialValues, open, reset])

  const validationSummary = useMemo(
    () => buildValidationSummary(errors),
    [errors],
  )

  const visibleValidationSummary = isMobile
    ? validationSummary.slice(0, MOBILE_MAX_SUMMARY_ERRORS)
    : validationSummary
  const hiddenValidationCount = validationSummary.length - visibleValidationSummary.length

  async function handleValidSubmit(values: EmbellishmentFormValues) {
    await onSubmit(values)
  }

  function handleInvalidSubmit(formErrors: FieldErrors<EmbellishmentFormValues>) {
    const firstInvalidField = getFirstInvalidField(formErrors)

    if (!firstInvalidField) {
      return
    }

    setFocus(firstInvalidField)

    window.requestAnimationFrame(() => {
      document.getElementById(`embellishment-field-${firstInvalidField}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl overflow-hidden p-0">
        <form
          className="flex max-h-[calc(100vh-2rem)] flex-col"
          onSubmit={handleSubmit(handleValidSubmit, handleInvalidSubmit)}
        >
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
                  {hiddenValidationCount > 0 ? (
                    <li className="font-medium">+{hiddenValidationCount} more</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-6 py-5">
              {loading ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-7 w-full rounded-md" />
                  <Skeleton className="h-24 w-full rounded-md" />
                  <Skeleton className="h-7 w-28 rounded-md" />
                </div>
              ) : (
                <>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <div id="embellishment-field-name" className="space-y-1.5">
                        <label
                          htmlFor={field.name}
                          className="text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          Embellishment name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          required
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Input embellishment name"
                          aria-invalid={Boolean(errors.name)}
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.name?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="remarks"
                    control={control}
                    render={({ field }) => (
                      <div id="embellishment-field-remarks" className="space-y-1.5">
                        <label
                          htmlFor={field.name}
                          className="text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          Remarks
                        </label>
                        <Textarea
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Input remarks"
                          className="min-h-24"
                          aria-invalid={Boolean(errors.remarks)}
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.remarks?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <div
                        id="embellishment-field-isActive"
                        className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-slate-50/70 px-3 py-3 dark:border-white/5 dark:bg-white/[0.03]"
                      >
                        <div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            Active
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Active embellishments are available for use in merchandising flows.
                          </p>
                        </div>
                        <Switch
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                          onBlur={field.onBlur}
                        />
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
                {mode === "create" ? "Save embellishment" : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
