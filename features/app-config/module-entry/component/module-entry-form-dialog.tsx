"use client"

import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Controller, useForm, type FieldErrors, type SubmitHandler } from "react-hook-form"
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

import type { ModuleEntryFormValues } from "../module-entry.types"

type ModuleEntryEditorMode = "create" | "edit"

type ModuleEntryFormDialogProps = {
  open: boolean
  mode: ModuleEntryEditorMode
  loading: boolean
  submitting: boolean
  error: string
  initialValues: ModuleEntryFormValues
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ModuleEntryFormValues) => void | Promise<void>
}

type ModuleEntryFieldName = keyof ModuleEntryFormValues

const MODULE_ENTRY_FIELD_ORDER: ModuleEntryFieldName[] = [
  "moduleName",
  "moduleKey",
  "description",
  "displayOrder",
  "isActive",
]

const moduleEntryFormSchema = z.object({
  moduleName: z.string().trim().min(1, "Module name is required."),
  moduleKey: z.string().trim().min(1, "Module key is required."),
  description: z.string().transform((value) => value.trim()),
  displayOrder: z.coerce.number().int().min(0, "Display order must be zero or greater."),
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

function buildValidationSummary(errors: FieldErrors<ModuleEntryFormValues>) {
  return MODULE_ENTRY_FIELD_ORDER.flatMap((field) => {
    const message = getErrorMessage(errors[field]?.message)

    if (!message) {
      return []
    }

    const label =
      field === "moduleName"
        ? "Module name"
        : field === "moduleKey"
          ? "Module key"
          : field === "description"
            ? "Description"
            : field === "displayOrder"
              ? "Display order"
              : "Active"

    return [{ field, label, message }]
  })
}

function getFirstInvalidField(errors: FieldErrors<ModuleEntryFormValues>) {
  return MODULE_ENTRY_FIELD_ORDER.find((field) => errors[field]) ?? null
}

function FieldErrorMessage({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">{message}</p>
}

export function ModuleEntryFormDialog({
  open,
  mode,
  loading,
  submitting,
  error,
  initialValues,
  onOpenChange,
  onSubmit,
}: ModuleEntryFormDialogProps) {
  const title = mode === "create" ? "Create module entry" : "Edit module entry"
  const description =
    mode === "create"
      ? "Add a new application module entry."
      : "Update the selected application module entry."

  const {
    control,
    clearErrors,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
  } = useForm<ModuleEntryFormValues>({
    resolver: zodResolver(moduleEntryFormSchema) as never,
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

  const handleValidSubmit: SubmitHandler<ModuleEntryFormValues> = async (values) => {
    await onSubmit(values)
  }

  function handleInvalidSubmit(formErrors: FieldErrors<ModuleEntryFormValues>) {
    const firstInvalidField = getFirstInvalidField(formErrors)

    if (!firstInvalidField) {
      return
    }

    setFocus(firstInvalidField)
    window.requestAnimationFrame(() => {
      document.getElementById(`module-entry-field-${firstInvalidField}`)?.scrollIntoView({
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
                  {validationSummary.map((entry) => (
                    <li key={entry.field} className="flex gap-2">
                      <span className="shrink-0 font-medium">{entry.label}:</span>
                      <span className="min-w-0 flex-1">{entry.message}</span>
                    </li>
                  ))}
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
                    name="moduleName"
                    control={control}
                    render={({ field }) => (
                      <div id="module-entry-field-moduleName" className="space-y-1.5">
                        <label htmlFor={field.name} className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Module name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          {...field}
                          id={field.name}
                          required
                          placeholder="Merchandising"
                          aria-invalid={Boolean(errors.moduleName)}
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.moduleName?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="moduleKey"
                    control={control}
                    render={({ field }) => (
                      <div id="module-entry-field-moduleKey" className="space-y-1.5">
                        <label htmlFor={field.name} className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Module key <span className="text-red-500">*</span>
                        </label>
                        <Input
                          {...field}
                          id={field.name}
                          required
                          placeholder="merchandising"
                          aria-invalid={Boolean(errors.moduleKey)}
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.moduleKey?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <div id="module-entry-field-description" className="space-y-1.5">
                        <label htmlFor={field.name} className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Description
                        </label>
                        <Textarea
                          {...field}
                          id={field.name}
                          placeholder="Optional short description"
                          className="min-h-24"
                          aria-invalid={Boolean(errors.description)}
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.description?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="displayOrder"
                    control={control}
                    render={({ field }) => (
                      <div id="module-entry-field-displayOrder" className="space-y-1.5">
                        <label htmlFor={field.name} className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Display order
                        </label>
                        <Input
                          {...field}
                          id={field.name}
                          type="number"
                          min={0}
                          placeholder="0"
                          aria-invalid={Boolean(errors.displayOrder)}
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.displayOrder?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <div
                        id="module-entry-field-isActive"
                        className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-slate-50/70 px-3 py-3 dark:border-white/5 dark:bg-white/[0.03]"
                      >
                        <div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            Active
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Active modules are available for application setup.
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
                {mode === "create" ? "Save module" : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
