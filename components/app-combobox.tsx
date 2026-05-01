"use client"

import { useState, type ReactNode } from "react"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { cn } from "@/lib/utils"

export type AppComboboxOption = {
  label: string
  value: string
}

type AppComboboxProps<T extends AppComboboxOption> = {
  items: T[]
  value: T | null
  onValueChange: (value: T | null) => void
  placeholder?: string
  loading?: boolean
  loadingMessage?: string
  emptyMessage?: string
  header?: ReactNode
  footer?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  showClear?: boolean
  className?: string
  inputClassName?: string
  contentClassName?: string
  listClassName?: string
  itemClassName?: string
  inputProps?: Omit<React.ComponentProps<typeof ComboboxInput>, "placeholder" | "className" | "disabled" | "showClear">
  isItemEqualToValue?: (item: T, value: T) => boolean
  renderItem?: (item: T) => ReactNode
}

export function AppCombobox<T extends AppComboboxOption>({
  items,
  value,
  onValueChange,
  placeholder = "Search...",
  loading = false,
  loadingMessage = "Loading...",
  emptyMessage = "No results found.",
  header,
  footer,
  open,
  onOpenChange,
  disabled = false,
  showClear,
  className,
  inputClassName,
  contentClassName,
  listClassName,
  itemClassName,
  inputProps,
  isItemEqualToValue,
  renderItem,
}: AppComboboxProps<T>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const resolvedOpen = open ?? uncontrolledOpen
  const handleOpenChange = onOpenChange ?? setUncontrolledOpen
  const resolvedDisabled = disabled || loading
  const resolvedShowClear = showClear ?? Boolean(value)

  return (
    <Combobox
      open={resolvedOpen}
      onOpenChange={handleOpenChange}
      items={items}
      value={value}
      onValueChange={onValueChange}
      isItemEqualToValue={isItemEqualToValue ?? ((item, currentValue) => item.value === currentValue.value)}
    >
      <ComboboxInput
        {...inputProps}
        placeholder={loading ? loadingMessage : placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        className={cn("w-full", inputClassName, className)}
        disabled={resolvedDisabled}
        showClear={resolvedShowClear}
      />
      <ComboboxContent className={contentClassName}>
        {header}
        <ComboboxEmpty className="py-5 text-xs">
          {loading ? loadingMessage : emptyMessage}
        </ComboboxEmpty>
        <ComboboxList className={listClassName}>
          {(item) => (
            <ComboboxItem
              key={item.value}
              value={item}
              className={cn("cursor-pointer px-3 py-2 text-xs font-medium", itemClassName)}
            >
              {renderItem ? renderItem(item) : item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
        {footer}
      </ComboboxContent>
    </Combobox>
  )
}
