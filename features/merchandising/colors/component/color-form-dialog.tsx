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

import type { ColorFormValues } from "../color.types"

type ColorEditorMode = "create" | "edit"

type ColorFormDialogProps = {
  open: boolean
  mode: ColorEditorMode
  loading: boolean
  submitting: boolean
  error: string
  initialValues: ColorFormValues
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ColorFormValues) => void | Promise<void>
}

type ColorFieldName = keyof ColorFormValues

type ValidationSummaryEntry = {
  field: ColorFieldName
  label: string
  message: string
}

const NEUTRAL_COLOR_SWATCH = "#9CA3AF"
const MOBILE_MAX_SUMMARY_ERRORS = 3
const COLOR_FIELD_ORDER: ColorFieldName[] = [
  "colorName",
  "colorDisplayName",
  "colorDescription",
  "colorHexCode",
  "isActive",
]

const colorHexCodePattern = /^#?[0-9A-Fa-f]{6}$/

function normalizeHexColorCode(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return ""
  }

  return trimmed.startsWith("#") ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`
}

function isValidHexColorCode(value: string) {
  return colorHexCodePattern.test(value.trim())
}

function getPickerColorValue(hexCode: string) {
  if (isValidHexColorCode(hexCode)) {
    return normalizeHexColorCode(hexCode)
  }

  return NEUTRAL_COLOR_SWATCH
}

const colorFormSchema = z.object({
  colorName: z.string().trim().min(1, "Color name is required."),
  colorDisplayName: z.string().transform((value) => value.trim()),
  colorDescription: z.string().transform((value) => value.trim()),
  colorHexCode: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value === "" || colorHexCodePattern.test(value), {
      message: "Hex color code must be a valid 6-digit hex value.",
    })
    .transform((value) => (value ? normalizeHexColorCode(value) : "")),
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

function buildValidationSummary(errors: FieldErrors<ColorFormValues>) {
  const entries: ValidationSummaryEntry[] = []

  for (const field of COLOR_FIELD_ORDER) {
    const message = getErrorMessage(errors[field]?.message)

    if (!message) {
      continue
    }

    const label =
      field === "colorName"
        ? "Color name"
        : field === "colorDisplayName"
          ? "Display name"
          : field === "colorDescription"
            ? "Description"
            : field === "colorHexCode"
              ? "Hex color code"
              : "Active"

    entries.push({
      field,
      label,
      message,
    })
  }

  return entries
}

function getFirstInvalidField(errors: FieldErrors<ColorFormValues>) {
  for (const field of COLOR_FIELD_ORDER) {
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

export function ColorFormDialog({
  open,
  mode,
  loading,
  submitting,
  error,
  initialValues,
  onOpenChange,
  onSubmit,
}: ColorFormDialogProps) {
  const title = mode === "create" ? "Create color" : "Edit color"
  const description =
    mode === "create"
      ? "Add a merchandising color master record."
      : "Update the selected merchandising color master record."
  const isMobile = useIsMobile()

  const {
    control,
    clearErrors,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
  } = useForm<ColorFormValues>({
    resolver: zodResolver(colorFormSchema),
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

  const validationSummary = useMemo(
    () => buildValidationSummary(errors),
    [errors],
  )

  const visibleValidationSummary = isMobile
    ? validationSummary.slice(0, MOBILE_MAX_SUMMARY_ERRORS)
    : validationSummary
  const hiddenValidationCount = validationSummary.length - visibleValidationSummary.length

  async function handleValidSubmit(values: ColorFormValues) {
    await onSubmit(values)
  }

  function handleInvalidSubmit(formErrors: FieldErrors<ColorFormValues>) {
    const firstInvalidField = getFirstInvalidField(formErrors)

    if (!firstInvalidField) {
      return
    }

    setFocus(firstInvalidField)

    window.requestAnimationFrame(() => {
      document.getElementById(`color-field-${firstInvalidField}`)?.scrollIntoView({
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
                  <Skeleton className="h-7 w-full rounded-md" />
                  <Skeleton className="h-24 w-full rounded-md" />
                  <Skeleton className="h-7 w-28 rounded-md" />
                </div>
              ) : (
                <>
                  <Controller
                    name="colorName"
                    control={control}
                    render={({ field }) => (
                      <div id="color-field-colorName" className="space-y-1.5">
                        <label
                          htmlFor={field.name}
                          className="text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          Color name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          required
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Input color name"
                          aria-invalid={Boolean(errors.colorName)}
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.colorName?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="colorDisplayName"
                    control={control}
                    render={({ field }) => (
                      <div id="color-field-colorDisplayName" className="space-y-1.5">
                        <label
                          htmlFor={field.name}
                          className="text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          Display name
                        </label>
                        <Input
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Input color display name"
                          aria-invalid={Boolean(errors.colorDisplayName)}
                        />
                        <FieldErrorMessage
                          message={getErrorMessage(errors.colorDisplayName?.message)}
                        />
                      </div>
                    )}
                  />

                  <Controller
                    name="colorDescription"
                    control={control}
                    render={({ field }) => (
                      <div id="color-field-colorDescription" className="space-y-1.5">
                        <label
                          htmlFor={field.name}
                          className="text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          Description
                        </label>
                        <Textarea
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Input description"
                          className="min-h-24"
                          aria-invalid={Boolean(errors.colorDescription)}
                        />
                        <FieldErrorMessage
                          message={getErrorMessage(errors.colorDescription?.message)}
                        />
                      </div>
                    )}
                  />

                  <Controller
                    name="colorHexCode"
                    control={control}
                    render={({ field }) => (
                      <div id="color-field-colorHexCode" className="space-y-1.5">
                        <label
                          htmlFor={field.name}
                          className="text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          Hex color code
                        </label>
                        <div className="flex items-center gap-3">
                          <Input
                            {...field}
                            id={field.name}
                            ref={field.ref}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder="Input hex color code"
                            className="sm:flex-1"
                            aria-invalid={Boolean(errors.colorHexCode)}
                          />
                          <label
                            htmlFor="colorHexCodePicker"
                            className="size-8 shrink-0 cursor-pointer rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-105 dark:border-white/10"
                            style={{
                              backgroundColor: getPickerColorValue(field.value),
                            }}
                          >
                            <span className="sr-only">Pick a color</span>
                            <Input
                              id="colorHexCodePicker"
                              type="color"
                              aria-label="Pick a color"
                              value={getPickerColorValue(field.value)}
                              onChange={(event) => field.onChange(normalizeHexColorCode(event.target.value))}
                              onBlur={field.onBlur}
                              className="sr-only"
                            />
                          </label>
                        </div>
                        <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                          Optional. Use a 6-digit hex value such as #1E88E5.
                        </p>
                        <FieldErrorMessage
                          message={getErrorMessage(errors.colorHexCode?.message)}
                        />
                      </div>
                    )}
                  />

                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <div
                        id="color-field-isActive"
                        className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-slate-50/70 px-3 py-3 dark:border-white/5 dark:bg-white/[0.03]"
                      >
                        <div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            Active
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Active colors are available for use in merchandising flows.
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || submitting}
                className="rounded-xl"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {mode === "create" ? "Save color" : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
