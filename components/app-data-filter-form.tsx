"use client"

import { type FormEvent, type ReactNode } from "react"
import { Plus, Search } from "lucide-react"

import { AppSelect } from "@/components/app-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type FilterFieldBase = {
  id: string
  label: string
  className?: string
}

export type AppDataTextFilterField = FilterFieldBase & {
  kind: "text"
  value: string
  placeholder?: string
  onValueChange: (value: string) => void
}

export type AppDataSelectFilterField = FilterFieldBase & {
  kind: "select"
  value: string
  placeholder?: string
  options: Array<{ value: string; label: string }>
  onValueChange: (value: string) => void
}

export type AppDataCustomFilterField = FilterFieldBase & {
  kind: "custom"
  control: ReactNode
}

export type AppDataFilterField = AppDataTextFilterField | AppDataSelectFilterField | AppDataCustomFilterField

type AppDataFilterFormProps = {
  fields: AppDataFilterField[]
  onSubmit: () => void
  onReset: () => void
  onCreate?: () => void
  createLabel?: string
  submitLabel?: string
  resetLabel?: string
  actions?: ReactNode
}

export function AppDataFilterForm({
  fields,
  onSubmit,
  onReset,
  onCreate,
  createLabel = "New",
  submitLabel = "Search",
  resetLabel = "Reset",
  actions,
}: AppDataFilterFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {fields.map((field) => (
        <div key={field.id} className={field.className ?? "min-w-0 space-y-1"}>
          <label htmlFor={field.id} className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {field.label}
          </label>
          {field.kind === "text" ? (
            <Input
              id={field.id}
              value={field.value}
              className="h-7 rounded-md px-2 text-xs"
              placeholder={field.placeholder}
              onChange={(event) => field.onValueChange(event.target.value)}
            />
          ) : field.kind === "select" ? (
            <AppSelect
              triggerId={field.id}
              value={field.value}
              onValueChange={field.onValueChange}
              placeholder={field.placeholder}
              options={field.options}
            />
          ) : (
            field.control
          )}
        </div>
      ))}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
        <Button type="submit" className="w-full rounded-xl sm:w-auto">
          <Search className="size-3.5" />
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={onReset}>
          {resetLabel}
        </Button>
        {onCreate ? (
          <Button type="button" className="w-full rounded-xl sm:w-auto" onClick={onCreate}>
            <Plus className="size-3.5" />
            {createLabel}
          </Button>
        ) : null}
        {actions}
      </div>
    </form>
  )
}
