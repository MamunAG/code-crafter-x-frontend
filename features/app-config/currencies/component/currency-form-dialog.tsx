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

import type { CurrencyFormValues } from "../currency.types"

type CurrencyEditorMode = "create" | "edit"
type CurrencyFieldName = keyof CurrencyFormValues

type CurrencyFormDialogProps = {
  open: boolean
  mode: CurrencyEditorMode
  loading: boolean
  submitting: boolean
  error: string
  initialValues: CurrencyFormValues
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CurrencyFormValues) => void | Promise<void>
}

const CURRENCY_FIELD_ORDER: CurrencyFieldName[] = ["currencyName", "currencyCode", "rate", "symbol", "isDefault", "isActive"]
const currencyFormSchema = z.object({
  currencyName: z.string().trim().min(1, "Currency name is required."),
  currencyCode: z.string().trim().min(1, "Currency code is required.").transform((value) => value.toUpperCase()),
  rate: z.string().trim().min(1, "Exchange rate is required.").refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, "Exchange rate must be greater than 0."),
  symbol: z.string().trim().min(1, "Currency symbol is required."),
  isDefault: z.boolean(),
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

function getFieldLabel(field: CurrencyFieldName) {
  if (field === "currencyName") return "Currency name"
  if (field === "currencyCode") return "Currency code"
  if (field === "rate") return "Exchange rate"
  if (field === "symbol") return "Symbol"
  if (field === "isDefault") return "Default"
  return "Active"
}

function buildValidationSummary(errors: FieldErrors<CurrencyFormValues>) {
  return CURRENCY_FIELD_ORDER.flatMap((field) => {
    const message = getErrorMessage(errors[field]?.message)
    if (!message) return []
    return [{ field, label: getFieldLabel(field), message }]
  })
}

function FieldErrorMessage({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">{message}</p>
}

export function CurrencyFormDialog({ open, mode, loading, submitting, error, initialValues, onOpenChange, onSubmit }: CurrencyFormDialogProps) {
  const isMobile = useIsMobile()
  const { control, clearErrors, handleSubmit, formState: { errors }, reset, setFocus } = useForm<CurrencyFormValues>({
    resolver: zodResolver(currencyFormSchema),
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

  function handleInvalidSubmit(formErrors: FieldErrors<CurrencyFormValues>) {
    const firstInvalidField = CURRENCY_FIELD_ORDER.find((field) => formErrors[field])
    if (!firstInvalidField) return
    setFocus(firstInvalidField)
    window.requestAnimationFrame(() => {
      document.getElementById(`currency-field-${firstInvalidField}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl overflow-hidden p-0">
        <form className="flex max-h-[calc(100vh-2rem)] flex-col" onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)}>
          <div className="border-b border-slate-200/70 px-6 pb-4 pt-6 dark:border-white/10">
            <DialogHeader>
              <DialogTitle>{mode === "create" ? "Create currency" : "Edit currency"}</DialogTitle>
              <DialogDescription>{mode === "create" ? "Add an application currency reference record." : "Update the selected application currency reference record."}</DialogDescription>
            </DialogHeader>
            {!loading && error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}
            {!loading && validationSummary.length > 0 ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                <p className="font-medium">Please fix the following:</p>
                <ul className="mt-1 space-y-1">
                  {visibleValidationSummary.map((entry) => <li key={entry.field} className="flex gap-2"><span className="shrink-0 font-medium">{entry.label}:</span><span>{entry.message}</span></li>)}
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
                  <Skeleton className="h-7 w-full rounded-md" />
                  <Skeleton className="h-7 w-full rounded-md" />
                  <Skeleton className="h-7 w-28 rounded-md" />
                </div>
              ) : (
                <>
                  {(["currencyName", "currencyCode", "rate", "symbol"] as const).map((fieldName) => (
                    <Controller
                      key={fieldName}
                      name={fieldName}
                      control={control}
                      render={({ field }) => (
                        <div id={`currency-field-${fieldName}`} className="space-y-1.5">
                          <label htmlFor={field.name} className="text-xs font-medium text-slate-700 dark:text-slate-300">{getFieldLabel(fieldName)} <span className="text-red-500">*</span></label>
                          <Input {...field} id={field.name} ref={field.ref} required type={fieldName === "rate" ? "number" : "text"} step={fieldName === "rate" ? "0.0001" : undefined} placeholder={`Input ${getFieldLabel(fieldName).toLowerCase()}`} aria-invalid={Boolean(errors[fieldName])} />
                          <FieldErrorMessage message={getErrorMessage(errors[fieldName]?.message)} />
                        </div>
                      )}
                    />
                  ))}
                  {(["isDefault", "isActive"] as const).map((fieldName) => (
                    <Controller
                      key={fieldName}
                      name={fieldName}
                      control={control}
                      render={({ field }) => (
                        <div id={`currency-field-${fieldName}`} className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-slate-50/70 px-3 py-3 dark:border-white/5 dark:bg-white/[0.03]">
                          <div>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{getFieldLabel(fieldName)}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{fieldName === "isDefault" ? "Mark as the default currency." : "Active currencies are available across app configuration flows."}</p>
                          </div>
                          <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} onBlur={field.onBlur} />
                        </div>
                      )}
                    />
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
          <div className="border-t border-slate-200/70 px-6 py-4 dark:border-white/10">
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={loading || submitting} className="rounded-xl">{submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}{mode === "create" ? "Save currency" : "Save changes"}</Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
