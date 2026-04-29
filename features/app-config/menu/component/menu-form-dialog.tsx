"use client"

import { useEffect, useMemo, useState } from "react"

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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

import type { MenuFormValues } from "../menu.types"

type MenuModuleOption = {
  label: string
  value: string
  moduleKey: string
}

type MenuEditorMode = "create" | "edit"

type MenuFormDialogProps = {
  open: boolean
  mode: MenuEditorMode
  loading: boolean
  submitting: boolean
  error: string
  initialValues: MenuFormValues
  moduleOptions: MenuModuleOption[]
  moduleLoading: boolean
  moduleError: string
  onOpenChange: (open: boolean) => void
  onSubmit: (values: MenuFormValues) => void | Promise<void>
}

type MenuFieldName = keyof MenuFormValues

type ValidationSummaryEntry = {
  field: MenuFieldName
  label: string
  message: string
}

const MENU_FIELD_ORDER: MenuFieldName[] = [
  "menuName",
  "moduleId",
  "description",
  "displayOrder",
  "isActive",
]

const menuFormSchema = z.object({
  menuName: z.string().trim().min(1, "Menu name is required."),
  moduleId: z.string().trim().min(1, "Module is required."),
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

function buildValidationSummary(errors: FieldErrors<MenuFormValues>) {
  const entries: ValidationSummaryEntry[] = []

  for (const field of MENU_FIELD_ORDER) {
    const message = getErrorMessage(errors[field]?.message)

    if (!message) {
      continue
    }

    const label =
      field === "menuName"
        ? "Menu name"
        : field === "moduleId"
            ? "Module"
          : field === "description"
            ? "Description"
            : field === "displayOrder"
              ? "Display order"
              : "Active"

    entries.push({
      field,
      label,
      message,
    })
  }

  return entries
}

function getFirstInvalidField(errors: FieldErrors<MenuFormValues>) {
  for (const field of MENU_FIELD_ORDER) {
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

export function MenuFormDialog({
  open,
  mode,
  loading,
  submitting,
  error,
  initialValues,
  moduleOptions,
  moduleLoading,
  moduleError,
  onOpenChange,
  onSubmit,
}: MenuFormDialogProps) {
  const title = mode === "create" ? "Create menu" : "Edit menu"
  const description =
    mode === "create"
      ? "Add a new application menu entry."
      : "Update the selected application menu entry."

  const {
    control,
    clearErrors,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
  } = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema) as never,
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  })
  const [moduleComboboxOpen, setModuleComboboxOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      reset(initialValues)
      clearErrors()
      setModuleComboboxOpen(false)
      return
    }

    reset(initialValues)
    clearErrors()
  }, [clearErrors, initialValues, open, reset])

  const validationSummary = useMemo(() => buildValidationSummary(errors), [errors])
  const moduleUnavailable = !moduleLoading && moduleOptions.length === 0

  const handleValidSubmit: SubmitHandler<MenuFormValues> = async (values) => {
    await onSubmit(values)
  }

  function handleInvalidSubmit(formErrors: FieldErrors<MenuFormValues>) {
    const firstInvalidField = getFirstInvalidField(formErrors)

    if (!firstInvalidField) {
      return
    }

    setFocus(firstInvalidField)

    window.requestAnimationFrame(() => {
      document.getElementById(`menu-field-${firstInvalidField}`)?.scrollIntoView({
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
                    name="moduleId"
                    control={control}
                    render={({ field }) => {
                      const currentModule = moduleOptions.find((option) => option.value === field.value) ?? null

                      return (
                        <div id="menu-field-moduleId" className="space-y-1.5">
                          <label
                            htmlFor="menu-module-combobox"
                            className="text-xs font-medium text-slate-700 dark:text-slate-300"
                          >
                            Module <span className="text-red-500">*</span>
                          </label>
                          <Combobox
                            open={moduleComboboxOpen}
                            onOpenChange={setModuleComboboxOpen}
                            items={moduleOptions}
                            value={currentModule}
                            onValueChange={(option) => {
                              field.onChange(option?.value ?? "")
                              setModuleComboboxOpen(false)
                            }}
                            isItemEqualToValue={(item, value) => item.value === value.value}
                          >
                            <ComboboxInput
                              id="menu-module-combobox"
                              placeholder={
                                moduleLoading
                                  ? "Loading modules..."
                                  : moduleOptions.length > 0
                                    ? "Select a module"
                                    : "No modules available"
                              }
                              showClear={Boolean(field.value)}
                              disabled={moduleLoading || moduleUnavailable}
                              className="w-full"
                              aria-invalid={Boolean(errors.moduleId)}
                            />
                            <ComboboxContent className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_18px_45px_rgba(0,0,0,0.38)]">
                              <div className="border-b border-slate-200/80 px-3 py-2.5 dark:border-white/10">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                                  Module
                                </p>
                                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                                  Every menu must belong to a module.
                                </p>
                              </div>
                              <ComboboxEmpty className="py-5 text-xs">
                                {moduleLoading
                                  ? "Loading modules..."
                                  : moduleError || moduleUnavailable
                                    ? moduleError || "No modules available."
                                    : "No modules match your search."}
                              </ComboboxEmpty>
                              <ComboboxList className="px-2 py-2">
                                {(item) => (
                                  <ComboboxItem
                                    key={item.value}
                                    value={item}
                                    className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200"
                                  >
                                    <span className="flex min-w-0 flex-1 flex-col">
                                      <span className="truncate">{item.label}</span>
                                      <span className="truncate text-[11px] font-normal text-slate-500 dark:text-slate-400">
                                        {item.moduleKey}
                                      </span>
                                    </span>
                                  </ComboboxItem>
                                )}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                          <FieldErrorMessage message={getErrorMessage(errors.moduleId?.message)} />
                        </div>
                      )
                    }}
                  />

                  <Controller
                    name="menuName"
                    control={control}
                    render={({ field }) => (
                      <div id="menu-field-menuName" className="space-y-1.5">
                        <label htmlFor={field.name} className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Menu name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          required
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Dashboard"
                          aria-invalid={Boolean(errors.menuName)}
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.menuName?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <div id="menu-field-description" className="space-y-1.5">
                        <label htmlFor={field.name} className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Description
                        </label>
                        <Textarea
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
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
                      <div id="menu-field-displayOrder" className="space-y-1.5">
                        <label htmlFor={field.name} className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Display order
                        </label>
                        <Input
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          type="number"
                          min={0}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="0"
                          aria-invalid={Boolean(errors.displayOrder)}
                        />
                        <FieldErrorMessage
                          message={getErrorMessage(errors.displayOrder?.message)}
                        />
                      </div>
                    )}
                  />

                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <div
                        id="menu-field-isActive"
                        className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-slate-50/70 px-3 py-3 dark:border-white/5 dark:bg-white/[0.03]"
                      >
                        <div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            Active
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Active menus are visible in the application.
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
              <Button type="submit" disabled={loading || submitting || moduleLoading || moduleUnavailable} className="rounded-xl">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {mode === "create" ? "Save menu" : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
