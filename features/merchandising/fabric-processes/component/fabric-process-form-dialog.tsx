"use client"

import { useEffect, useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Controller, useForm, type FieldErrors } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { AppSelect } from "@/components/app-select"
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

import type { FabricProcessFormValues, FabricProcessRecord } from "../fabric-process.types"

type FabricProcessEditorMode = "create" | "edit"

type FabricProcessFormDialogProps = {
  open: boolean
  mode: FabricProcessEditorMode
  loading: boolean
  submitting: boolean
  error: string
  initialValues: FabricProcessFormValues
  parentProcesses: FabricProcessRecord[]
  onOpenChange: (open: boolean) => void
  onSubmit: (values: FabricProcessFormValues) => void | Promise<void>
}

type FabricProcessFieldName = keyof FabricProcessFormValues

type ValidationSummaryEntry = {
  field: FabricProcessFieldName
  label: string
  message: string
}

const MOBILE_MAX_SUMMARY_ERRORS = 3
const FIELD_ORDER: FabricProcessFieldName[] = ["name", "processType", "parentProcessId", "stage", "sortOrder", "isActive"]
const PROCESS_TYPE_OPTIONS = [
  { value: "STEP", label: "Process step" },
  { value: "GROUP", label: "Process group" },
]
const STAGE_OPTIONS = [
  { value: "YARN_PREPARATION", label: "Yarn preparation" },
  { value: "YARN_TO_GREY", label: "Yarn to grey" },
  { value: "GREY_TO_FINISHED", label: "Grey to finished" },
]

const fabricProcessFormSchema = z.object({
  name: z.string().trim().min(1, "Fabric process name is required."),
  processType: z.enum(["GROUP", "STEP"]),
  parentProcessId: z.string(),
  stage: z.enum(["YARN_PREPARATION", "YARN_TO_GREY", "GREY_TO_FINISHED"]),
  sortOrder: z.string().refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, "Sort order must be zero or greater."),
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

function buildValidationSummary(errors: FieldErrors<FabricProcessFormValues>) {
  const entries: ValidationSummaryEntry[] = []

  for (const field of FIELD_ORDER) {
    const message = getErrorMessage(errors[field]?.message)
    if (!message) continue

    entries.push({
      field,
      label: field === "name" ? "Fabric process name" : field.replaceAll(/([A-Z])/g, " $1"),
      message,
    })
  }

  return entries
}

function getFirstInvalidField(errors: FieldErrors<FabricProcessFormValues>) {
  for (const field of FIELD_ORDER) {
    if (errors[field]) return field
  }

  return null
}

function FieldErrorMessage({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">{message}</p>
}

export function FabricProcessFormDialog({
  open,
  mode,
  loading,
  submitting,
  error,
  initialValues,
  parentProcesses,
  onOpenChange,
  onSubmit,
}: FabricProcessFormDialogProps) {
  const isMobile = useIsMobile()
  const title = mode === "create" ? "Create fabric process" : "Edit fabric process"
  const description =
    mode === "create"
      ? "Add a merchandising fabric process master record."
      : "Update the selected merchandising fabric process record."

  const {
    control,
    clearErrors,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
    setValue,
    watch,
  } = useForm<FabricProcessFormValues>({
    resolver: zodResolver(fabricProcessFormSchema),
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
  const visibleValidationSummary = isMobile
    ? validationSummary.slice(0, MOBILE_MAX_SUMMARY_ERRORS)
    : validationSummary
  const hiddenValidationCount = validationSummary.length - visibleValidationSummary.length
  const processType = watch("processType")
  const parentProcessId = watch("parentProcessId")

  function handleInvalidSubmit(formErrors: FieldErrors<FabricProcessFormValues>) {
    const firstInvalidField = getFirstInvalidField(formErrors)
    if (!firstInvalidField) return

    setFocus(firstInvalidField)
    window.requestAnimationFrame(() => {
      document.getElementById(`fabric-process-field-${firstInvalidField}`)?.scrollIntoView({
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
          onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)}
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
                  <Skeleton className="h-28 w-full rounded-2xl" />
                </div>
              ) : (
                <>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <div id="fabric-process-field-name" className="space-y-2">
                        <label htmlFor={field.name} className="text-sm font-medium">
                          Fabric process name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          {...field}
                          id={field.name}
                          ref={field.ref}
                          placeholder="Input fabric process name"
                          required
                          aria-invalid={Boolean(errors.name)}
                        />
                        <FieldErrorMessage message={getErrorMessage(errors.name?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="processType"
                    control={control}
                    render={({ field }) => (
                      <div id="fabric-process-field-processType" className="space-y-2">
                        <label htmlFor={field.name} className="text-sm font-medium">Process type</label>
                        <AppSelect
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value)
                            if (value === "GROUP") setValue("parentProcessId", "")
                          }}
                          options={PROCESS_TYPE_OPTIONS}
                          triggerId={field.name}
                          triggerClassName="h-10"
                        />
                      </div>
                    )}
                  />

                  <Controller
                    name="parentProcessId"
                    control={control}
                    render={({ field }) => (
                      <div id="fabric-process-field-parentProcessId" className="space-y-2">
                        <label htmlFor={field.name} className="text-sm font-medium">Parent group</label>
                        <AppSelect
                          value={processType === "GROUP" ? "__none__" : field.value || "__none__"}
                          onValueChange={(value) => {
                            const normalizedValue = value === "__none__" ? "" : value
                            field.onChange(normalizedValue)
                            const parent = parentProcesses.find((process) => String(process.id) === normalizedValue)
                            if (parent) setValue("stage", parent.stage)
                          }}
                          options={[
                            { value: "__none__", label: "No parent group" },
                            ...parentProcesses.map((process) => ({ value: String(process.id), label: process.name })),
                          ]}
                          triggerId={field.name}
                          triggerClassName="h-10"
                          disabled={processType === "GROUP"}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Steps inherit the selected group production stage.</p>
                      </div>
                    )}
                  />

                  <Controller
                    name="stage"
                    control={control}
                    render={({ field }) => (
                      <div id="fabric-process-field-stage" className="space-y-2">
                        <label htmlFor={field.name} className="text-sm font-medium">Production stage</label>
                        <AppSelect value={field.value} onValueChange={field.onChange} options={STAGE_OPTIONS} triggerId={field.name} triggerClassName="h-10" disabled={Boolean(parentProcessId)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="sortOrder"
                    control={control}
                    render={({ field }) => (
                      <div id="fabric-process-field-sortOrder" className="space-y-2">
                        <label htmlFor={field.name} className="text-sm font-medium">Sort order</label>
                        <Input {...field} id={field.name} type="number" min="0" step="1" aria-invalid={Boolean(errors.sortOrder)} />
                        <FieldErrorMessage message={getErrorMessage(errors.sortOrder?.message)} />
                      </div>
                    )}
                  />

                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <div
                        id="fabric-process-field-isActive"
                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <label htmlFor={field.name} className="text-sm font-medium">
                              Active
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Active fabric processes can be used in merchandising records.
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || submitting} className="rounded-xl">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {mode === "create" ? "Save fabric process" : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
