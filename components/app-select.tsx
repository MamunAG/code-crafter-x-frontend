"use client"

import type { ReactNode } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type AppSelectOption = {
  label: ReactNode
  value: string
  disabled?: boolean
}

type AppSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: AppSelectOption[]
  placeholder?: string
  disabled?: boolean
  triggerId?: string
  triggerClassName?: string
  contentClassName?: string
  itemClassName?: string
}

const APP_SELECT_CONTENT_CLASS =
  "overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"

const APP_SELECT_ITEM_CLASS =
  "hover:bg-slate-900/40 hover:text-slate-100 focus:bg-slate-900/40 focus:text-slate-100 data-highlighted:bg-slate-900/40 data-highlighted:text-slate-100 dark:hover:bg-white/5 dark:hover:text-slate-100 dark:focus:bg-white/5 dark:focus:text-slate-100 dark:data-highlighted:bg-white/5 dark:data-highlighted:text-slate-100"

export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled = false,
  triggerId,
  triggerClassName,
  contentClassName,
  itemClassName,
}: AppSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={triggerId} className={cn("h-7 w-full rounded-md px-2 text-xs", triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn(APP_SELECT_CONTENT_CLASS, contentClassName)}>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={cn(APP_SELECT_ITEM_CLASS, itemClassName)}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
