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
import { useIsMobile } from "@/hooks/use-mobile"

import type { UnitFormValues } from "../unit.types"

type UnitEditorMode = "create" | "edit"

type UnitFormDialogProps = {
  open: boolean
  mode: UnitEditorMode
  loading: boolean
  submitting: boolean
  error: string
  initialValues: UnitFormValues
  onOpenChange: (open: boolean) => void
  onSubmit: (values: UnitFormValues) => void | Promise<void>
}

type UnitFieldName = keyof UnitFormValues

type ValidationSummaryEntry = {
  field: UnitFieldName
  label: string
  message: string
}

const MOBILE_MAX_SUMMARY_ERRORS = 3
const UNIT_FIELD_ORDER: UnitFieldName[] = ["name", "shortName", "isActive"]

const unitFormSchema = z.object({
  name: z.string().trim().min(1, "Unit name is required."),
  shortName: z.string().trim().min(1, "Unit short name is required."),
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

function buildValidationSummary(errors: FieldErrors<UnitFormValues>) {
  const entries: ValidationSummaryEntry[] = []

  for (const field of UNIT_FIELD_ORDER) {
    const message = getErrorMessage(errors[field]?.message)

    if (!message) {
      continue
    }

    entries.push({
      field,
      label:
        field === "name"
          ? "Unit name"
          : field === "shortName"
            ? "Unit short name"
            : "Active",
      message,
    })
  }

  return entries
}

function getFirstInvalidField(errors: FieldErrors<UnitFormValues>) {
  for (const field of UNIT_FIELD_ORDER) {
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

export function UnitFormDialog({
  open,
  mode,
  loading,
  submitting,
  error,
  initialValues,
  onOpenChange,
  onSubmit,
}: UnitFormDialogProps) {
  const isMobile = useIsMobile()
  const title = mode === "create" ? "Create unit" : "Edit unit"
  const description =
    mode === "create"
      ? "Add a unit master record."
      : "Update the selected unit master record."

  const {
    control,
    clearErrors,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
  } = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  })

  useEffect(() => {
    if (!open) {
      reset(initialValues)
      clearErrors()
      return
    }

    reset(initialValues)
    clearErrors()
  }, [clearErrors, initialValues, open, reset])

  const validationSummary = useMemo(() => buildValidationSummary(errors), [errors])
  const visibleValidationSummary = isMobile
    ? validationSummary.slice(0, MOBILE_MAX_SUMMARY_ERRORS)
    : validationSummary
  const hiddenValidationCount = validationSummary.length - visibleValidationSummary.length

  async function handleValidSubmit(values: UnitFormValues) {
    await onSubmit(values)
  }

  function handleInvalidSubmit(formErrors: FieldErrors<UnitFormValues>) {
    const firstInvalidField = getFirstInvalidField(formErrors)

    if (!firstInvalidField) {
      return
    }

    setFocus(firstInvalidField)

    window.requestAnimationFrame(() => {
      document.getElementById(`unit-field-${firstInvalidField}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
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
                  {hiddenValidationCount > 0 ? <li className="font-medium">+{hiddenValidationCount} more</li> : null}
                </ul>
              </div>
            ) : null}
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-6 py-5">
              {loading ? (
                <div className="space-y-4 py-2">
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-28 w-full rounded-2xl" />
                </div>
              ) : (
                <>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <div id="unit-field-name" className="space-y-2">
                        <label htmlFor={field.name} className="text-sm font-medium">
                          Unit name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Input unit name"
                          required
                          aria-invalid={Boolean(errors.name)}
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.name?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="shortName"
                    control={control}
                    render={({ field }) => (
                      <div id="unit-field-shortName" className="space-y-2">
                        <label htmlFor={field.name} className="text-sm font-medium">
                          Unit short name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Input unit short name"
                          required
                          aria-invalid={Boolean(errors.shortName)}
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.shortName?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <div
                        id="unit-field-isActive"
                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <label htmlFor={field.name} className="text-sm font-medium">
                              Active
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Active units can be used in merchandising records.
                            </p>
                          </div>
                          <Switch
                            id={field.name}
                            checked={Boolean(field.value)}
                            onCheckedChange={field.onChange}
                            onBlur={field.onBlur}
                          />
                        </div>
                      </div>
                    )}
                  />
                </>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-slate-200/70 px-6 py-4 dark:border-white/10">
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || submitting} className="rounded-xl">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {mode === "create" ? "Save unit" : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
