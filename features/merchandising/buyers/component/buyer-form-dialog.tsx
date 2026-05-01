"use client"

import { useEffect, useMemo, useState } from "react"

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
import {
  AppCombobox,
  type AppComboboxLoadParams,
  type AppComboboxLoadResult,
  type AppComboboxOption,
} from "@/components/app-combobox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useIsMobile } from "@/hooks/use-mobile"

import type { CountryRecord } from "@/features/app-config/countries/country.types"

import type { BuyerFormValues } from "../buyer.types"

type BuyerEditorMode = "create" | "edit"

type BuyerFormDialogProps = {
  open: boolean
  mode: BuyerEditorMode
  loading: boolean
  submitting: boolean
  error: string
  initialCountry: CountryOption | null
  loadCountryOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<CountryOption>>
  initialValues: BuyerFormValues
  onOpenChange: (open: boolean) => void
  onSubmit: (values: BuyerFormValues) => void | Promise<void>
}

type BuyerFieldName = keyof BuyerFormValues

type ValidationSummaryEntry = {
  field: BuyerFieldName
  label: string
  message: string
}

type CountryOption = CountryRecord & AppComboboxOption

const MOBILE_MAX_SUMMARY_ERRORS = 3
const BUYER_FIELD_ORDER: BuyerFieldName[] = [
  "name",
  "displayName",
  "contact",
  "email",
  "countryId",
  "address",
  "remarks",
  "isActive",
]

const buyerFormSchema = z.object({
  name: z.string().trim().min(1, "Buyer name is required."),
  displayName: z.string().trim().min(1, "Buyer display name is required."),
  contact: z.string().trim(),
  email: z.string().trim().refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "Please enter a valid email address.",
  ),
  countryId: z.string().trim(),
  address: z.string().trim(),
  remarks: z.string().trim().max(500, "Remarks must be 500 characters or fewer."),
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

function buildValidationSummary(errors: FieldErrors<BuyerFormValues>) {
  const entries: ValidationSummaryEntry[] = []

  for (const field of BUYER_FIELD_ORDER) {
    const message = getErrorMessage(errors[field]?.message)

    if (!message) {
      continue
    }

    entries.push({
      field,
      label:
        field === "name"
          ? "Buyer name"
          : field === "displayName"
            ? "Buyer display name"
            : field === "contact"
              ? "Buyer contact"
              : field === "email"
                ? "Buyer email"
                : field === "countryId"
                  ? "Country"
                  : field === "address"
                    ? "Buyer address"
                    : field === "remarks"
                      ? "Remarks"
                      : "Active",
      message,
    })
  }

  return entries
}

function getFirstInvalidField(errors: FieldErrors<BuyerFormValues>) {
  for (const field of BUYER_FIELD_ORDER) {
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

export function BuyerFormDialog({
  open,
  mode,
  loading,
  submitting,
  error,
  initialCountry,
  loadCountryOptions,
  initialValues,
  onOpenChange,
  onSubmit,
}: BuyerFormDialogProps) {
  const isMobile = useIsMobile()
  const [countryComboboxOpen, setCountryComboboxOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(initialCountry)
  const title = mode === "create" ? "Create buyer" : "Edit buyer"
  const description =
    mode === "create"
      ? "Add a buyer master record."
      : "Update the selected buyer master record."

  const {
    control,
    clearErrors,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
  } = useForm<BuyerFormValues>({
    resolver: zodResolver(buyerFormSchema),
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

  async function handleValidSubmit(values: BuyerFormValues) {
    await onSubmit(values)
  }

  function handleInvalidSubmit(formErrors: FieldErrors<BuyerFormValues>) {
    const firstInvalidField = getFirstInvalidField(formErrors)

    if (!firstInvalidField) {
      return
    }

    setFocus(firstInvalidField)

    window.requestAnimationFrame(() => {
      document.getElementById(`buyer-field-${firstInvalidField}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
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
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-28 w-full rounded-2xl" />
                  <Skeleton className="h-28 w-full rounded-2xl" />
                  <Skeleton className="h-28 w-full rounded-2xl" />
                </div>
              ) : (
                <>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <div id="buyer-field-name" className="space-y-2">
                        <label htmlFor={field.name} className="text-sm font-medium">
                          Buyer name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Input buyer name"
                          aria-invalid={Boolean(errors.name)}
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.name?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="displayName"
                    control={control}
                    render={({ field }) => (
                      <div id="buyer-field-displayName" className="space-y-2">
                        <label htmlFor={field.name} className="text-sm font-medium">
                          Buyer display name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Input buyer display name"
                          aria-invalid={Boolean(errors.displayName)}
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.displayName?.message)} />
                      </div>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Controller
                      name="contact"
                      control={control}
                      render={({ field }) => (
                        <div id="buyer-field-contact" className="space-y-2">
                          <label htmlFor={field.name} className="text-sm font-medium">
                            Buyer contact
                          </label>
                          <Input
                            {...field}
                            id={field.name}
                            ref={field.ref}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder="Input buyer contact"
                            aria-invalid={Boolean(errors.contact)}
                          />
                          <FieldErrorMessage message={getErrorMessage(errors.contact?.message)} />
                        </div>
                      )}
                    />

                    <Controller
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <div id="buyer-field-email" className="space-y-2">
                          <label htmlFor={field.name} className="text-sm font-medium">
                            Buyer email
                          </label>
                          <Input
                            {...field}
                            id={field.name}
                            ref={field.ref}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            type="email"
                            placeholder="buyer@example.com"
                            aria-invalid={Boolean(errors.email)}
                          />
                          <FieldErrorMessage message={getErrorMessage(errors.email?.message)} />
                        </div>
                      )}
                    />
                  </div>

                  <Controller
                    name="countryId"
                    control={control}
                    render={({ field }) => (
                      <div id="buyer-field-countryId" className="space-y-2">
                        <label htmlFor="buyer-country-combobox" className="text-sm font-medium">
                          Country
                        </label>
                        <AppCombobox
                          open={countryComboboxOpen}
                          onOpenChange={setCountryComboboxOpen}
                          value={selectedCountry}
                          onValueChange={(country) => {
                            setSelectedCountry(country)
                            field.onChange(country?.value ?? "")
                            setCountryComboboxOpen(false)
                          }}
                          loadItems={loadCountryOptions}
                          initialLimit={10}
                          searchLimit={10}
                          inputProps={{
                            id: "buyer-country-combobox",
                            "aria-invalid": Boolean(errors.countryId),
                          }}
                          placeholder="Search country"
                          loadingMessage="Loading countries..."
                          emptyMessage="No countries match your search."
                          showClear={Boolean(field.value)}
                          contentClassName="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_18px_45px_rgba(0,0,0,0.38)]"
                          header={
                            <div className="border-b border-slate-200/80 px-3 py-2.5 dark:border-white/10">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                                Country
                              </p>
                              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                                Search and select the buyer country.
                              </p>
                            </div>
                          }
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.countryId?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="address"
                    control={control}
                    render={({ field }) => (
                      <div id="buyer-field-address" className="space-y-2">
                        <label htmlFor={field.name} className="text-sm font-medium">
                          Buyer address
                        </label>
                        <Textarea
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Input buyer address"
                          rows={4}
                          aria-invalid={Boolean(errors.address)}
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.address?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="remarks"
                    control={control}
                    render={({ field }) => (
                      <div id="buyer-field-remarks" className="space-y-2">
                        <label htmlFor={field.name} className="text-sm font-medium">
                          Remarks
                        </label>
                        <Textarea
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Optional remarks"
                          rows={4}
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
                        id="buyer-field-isActive"
                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <label htmlFor={field.name} className="text-sm font-medium">
                              Active
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Active buyers can be used in merchandising records.
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
                {mode === "create" ? "Save buyer" : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
