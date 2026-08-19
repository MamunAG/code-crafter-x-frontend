"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { AppSelect } from "@/components/app-select"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type HrFormValue = string | number | boolean | File | null | undefined
export type HrFormValues = Record<string, HrFormValue>
export type HrFormField = {
  name: string
  label: string
  kind?:
    | "text"
    | "number"
    | "date"
    | "time"
    | "datetime-local"
    | "textarea"
    | "select"
    | "switch"
    | "file"
  required?: boolean
  placeholder?: string
  description?: string
  options?: Array<{ value: string; label: string }>
  min?: number
  max?: number
  step?: number
  accept?: string
  className?: string
  disabled?: boolean
}

export function HrFormFields({
  fields,
  values,
  disabled,
  onChange,
}: {
  fields: HrFormField[]
  values: HrFormValues
  disabled?: boolean
  onChange: (name: string, value: HrFormValue) => void
}) {
  return fields.map((field) => {
    const value = values[field.name]
    const fieldDisabled = disabled || field.disabled
    if (field.kind === "switch")
      return (
        <div
          key={field.name}
          className={cn(
            "flex items-center justify-between gap-4 rounded-xl border bg-slate-50/70 p-4 dark:bg-white/[0.03]",
            field.className
          )}
        >
          <div>
            <p className="text-sm font-medium">{field.label}</p>
            {field.description ? (
              <p className="text-xs text-muted-foreground">
                {field.description}
              </p>
            ) : null}
          </div>
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(field.name, checked)}
            disabled={fieldDisabled}
          />
        </div>
      )
    return (
      <div key={field.name} className={cn("space-y-2", field.className)}>
        <label htmlFor={field.name} className="text-sm font-medium">
          {field.label}
          {field.required ? " *" : ""}
        </label>
        {field.kind === "textarea" ? (
          <Textarea
            id={field.name}
            rows={4}
            value={String(value ?? "")}
            placeholder={field.placeholder}
            disabled={fieldDisabled}
            onChange={(event) => onChange(field.name, event.target.value)}
          />
        ) : field.kind === "select" ? (
          <AppSelect
            triggerId={field.name}
            triggerClassName="h-9 text-sm"
            value={String(value ?? "")}
            onValueChange={(next) => onChange(field.name, next)}
            options={field.options ?? []}
            placeholder={
              field.placeholder ?? `Select ${field.label.toLowerCase()}`
            }
            disabled={fieldDisabled}
          />
        ) : field.kind === "file" ? (
          <Input
            id={field.name}
            type="file"
            accept={field.accept}
            disabled={fieldDisabled}
            onChange={(event) =>
              onChange(field.name, event.target.files?.[0] ?? null)
            }
          />
        ) : (
          <Input
            id={field.name}
            type={field.kind ?? "text"}
            min={field.min}
            max={field.max}
            step={field.step}
            value={
              typeof value === "string" || typeof value === "number"
                ? value
                : ""
            }
            placeholder={field.placeholder}
            disabled={fieldDisabled}
            onChange={(event) =>
              onChange(
                field.name,
                field.kind === "number"
                  ? event.target.value === ""
                    ? ""
                    : Number(event.target.value)
                  : event.target.value
              )
            }
          />
        )}
        {field.description ? (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        ) : null}
      </div>
    )
  })
}

export function HrFormDialog({
  open,
  title,
  description,
  fields,
  values,
  submitting,
  error,
  submitLabel = "Save",
  onOpenChange,
  onChange,
  onSubmit,
  children,
}: {
  open: boolean
  title: string
  description: string
  fields?: HrFormField[]
  values: HrFormValues
  submitting?: boolean
  error?: string
  submitLabel?: string
  onOpenChange: (open: boolean) => void
  onChange: (name: string, value: HrFormValue) => void
  onSubmit: () => void
  children?: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-3xl">
        <form
          className="flex max-h-[calc(100vh-2rem)] flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <div className="border-b border-slate-200/70 px-6 pt-6 pb-4 dark:border-white/10">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            {error ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </p>
            ) : null}
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              <HrFormFields
                fields={fields ?? []}
                values={values}
                disabled={submitting}
                onChange={onChange}
              />
              {children}
            </div>
          </ScrollArea>
          <DialogFooter className="border-t border-slate-200/70 px-6 py-4 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
