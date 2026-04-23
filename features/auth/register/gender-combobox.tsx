"use client"

import { CaretDown } from "@phosphor-icons/react"
import { useEffect, useMemo, useRef, useState } from "react"

import type { GenderOption } from "./register.types"

type GenderComboboxProps = {
  name: string
  value: string
  options: GenderOption[]
  loading?: boolean
  onChange: (value: string) => void
}

export function GenderCombobox({
  name,
  value,
  options,
  loading = false,
  onChange,
}: GenderComboboxProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  )

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!open) {
        return
      }

      if (event.key === "Escape") {
        event.preventDefault()
        setOpen(false)
        buttonRef.current?.focus()
        return
      }

      if (event.key === "ArrowDown") {
        event.preventDefault()
        setActiveIndex((current) => {
          const nextIndex = current < options.length - 1 ? current + 1 : 0
          optionRefs.current[nextIndex]?.focus()
          return nextIndex
        })
      }

      if (event.key === "ArrowUp") {
        event.preventDefault()
        setActiveIndex((current) => {
          const nextIndex = current > 0 ? current - 1 : options.length - 1
          optionRefs.current[nextIndex]?.focus()
          return nextIndex
        })
      }
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open, options.length])

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1)
      return
    }

    const selectedIndex = options.findIndex((option) => option.value === value)
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }, [open, options, value])

  useEffect(() => {
    if (!open || activeIndex < 0) {
      return
    }

    optionRefs.current[activeIndex]?.focus()
  }, [activeIndex, open])

  function selectOption(optionValue: string) {
    onChange(optionValue)
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${name}-listbox`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-white/20 dark:focus:ring-white/10"
      >
        <span className={selectedOption ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}>
          {loading ? "Loading..." : selectedOption?.label ?? "Select gender"}
        </span>
        <CaretDown
          className={`ml-3 size-4 shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${open ? "rotate-180" : ""}`}
          weight="bold"
        />
      </button>

      {open ? (
        <div
          id={`${name}-listbox`}
          role="listbox"
          aria-label="Gender options"
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-950 dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
        >
          <div className="max-h-56 overflow-auto">
            {options.map((option, index) => {
              const isSelected = option.value === value
              const isActive = index === activeIndex

              return (
                <button
                  key={option.value}
                  ref={(node) => {
                    optionRefs.current[index] = node
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectOption(option.value)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm outline-none transition ${
                    isActive
                      ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                  } ${isSelected ? "font-medium" : ""}`}
                >
                  <span>{option.label}</span>
                  {isSelected ? (
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Selected
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

